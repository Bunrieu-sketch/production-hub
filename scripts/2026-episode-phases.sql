BEGIN;

WITH series_dates(series_id, preprod_start, shoot_start, shoot_end) AS (
  VALUES
    (8, '2026-01-26', '2026-03-01', '2026-03-15'),
    (9, '2026-02-23', '2026-04-01', '2026-04-15'),
    (10, '2026-03-23', '2026-05-01', '2026-05-15'),
    (11, '2026-04-27', '2026-06-01', '2026-06-15'),
    (12, '2026-06-22', '2026-08-01', '2026-08-10'),
    (13, '2026-07-27', '2026-09-01', '2026-09-14'),
    (14, '2026-10-26', '2026-12-01', '2026-12-14')
),
ordered_episodes AS (
  SELECT
    e.id AS episode_id,
    e.series_id,
    ROW_NUMBER() OVER (PARTITION BY e.series_id ORDER BY e.sort_order, e.id) AS ep_index
  FROM episodes e
  JOIN series_dates sd ON sd.series_id = e.series_id
),
missing_episodes AS (
  SELECT oe.*
  FROM ordered_episodes oe
  LEFT JOIN episode_phases ep ON ep.episode_id = oe.episode_id
  WHERE ep.episode_id IS NULL
),
phase_rows AS (
  SELECT
    me.episode_id,
    'preprod' AS phase,
    sd.preprod_start AS start_date,
    date(sd.shoot_start, '-1 day') AS end_date
  FROM missing_episodes me
  JOIN series_dates sd ON sd.series_id = me.series_id

  UNION ALL

  SELECT
    me.episode_id,
    'shoot' AS phase,
    sd.shoot_start AS start_date,
    sd.shoot_end AS end_date
  FROM missing_episodes me
  JOIN series_dates sd ON sd.series_id = me.series_id

  UNION ALL

  SELECT
    me.episode_id,
    'post' AS phase,
    date(sd.shoot_end, '+1 day', printf('+%d day', (me.ep_index - 1) * 7)) AS start_date,
    date(sd.shoot_end, '+1 day', printf('+%d day', (me.ep_index - 1) * 7), '+13 day') AS end_date
  FROM missing_episodes me
  JOIN series_dates sd ON sd.series_id = me.series_id

  UNION ALL

  SELECT
    me.episode_id,
    'publish' AS phase,
    date(sd.shoot_end, '+14 day', printf('+%d day', (me.ep_index - 1) * 7)) AS start_date,
    date(sd.shoot_end, '+14 day', printf('+%d day', (me.ep_index - 1) * 7)) AS end_date
  FROM missing_episodes me
  JOIN series_dates sd ON sd.series_id = me.series_id
)
INSERT INTO episode_phases (
  episode_id,
  phase,
  start_date,
  end_date,
  status,
  confidence,
  source
)
SELECT
  episode_id,
  phase,
  start_date,
  end_date,
  'planned' AS status,
  0.5 AS confidence,
  'inferred' AS source
FROM phase_rows;

-- Special status overrides
UPDATE episode_phases
SET status = 'done'
WHERE episode_id = 10 AND phase IN ('preprod', 'shoot');

UPDATE episode_phases
SET status = 'in_progress'
WHERE episode_id = 10 AND phase = 'post';

UPDATE episode_phases
SET status = 'done'
WHERE episode_id IN (8, 9) AND phase = 'preprod';

UPDATE episode_phases
SET status = 'in_progress'
WHERE episode_id IN (8, 9) AND phase = 'shoot';

UPDATE episode_phases
SET status = 'done'
WHERE episode_id = 6 AND phase IN ('preprod', 'shoot', 'post');

UPDATE episode_phases
SET status = 'planned'
WHERE episode_id = 6 AND phase = 'publish';

COMMIT;
