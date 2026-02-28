'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronRight, ChevronLeft, Zap, ZapOff, Loader2, Search } from 'lucide-react';
import { useMissionControl } from '@/app/mission-control/lib/store';
import type { Agent, AgentStatus, OpenClawSession } from '@/app/mission-control/lib/types';
import { AgentModal } from './AgentModal';
import { DiscoverAgentsModal } from './DiscoverAgentsModal';

type FilterTab = 'all' | 'working' | 'standby';

interface AgentsSidebarProps {
  workspaceId?: string;
}

export function AgentsSidebar({ workspaceId }: AgentsSidebarProps) {
  const { agents, selectedAgent, setSelectedAgent, agentOpenClawSessions, setAgentOpenClawSession } = useMissionControl();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [connectingAgentId, setConnectingAgentId] = useState<string | null>(null);
  const [activeSubAgents, setActiveSubAgents] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = () => setIsMinimized(!isMinimized);

  // Load OpenClaw session status for all agents on mount
  const loadOpenClawSessions = useCallback(async () => {
    for (const agent of agents) {
      try {
        const res = await fetch(`/api/mission-control/agents/${agent.id}/openclaw`);
        if (res.ok) {
          const data = await res.json();
          if (data.linked && data.session) {
            setAgentOpenClawSession(agent.id, data.session as OpenClawSession);
          }
        }
      } catch (error) {
        console.error(`Failed to load OpenClaw session for ${agent.name}:`, error);
      }
    }
  }, [agents, setAgentOpenClawSession]);

  useEffect(() => {
    if (agents.length > 0) {
      loadOpenClawSessions();
    }
  }, [loadOpenClawSessions, agents.length]);

  // Load active sub-agent count
  useEffect(() => {
    const loadSubAgentCount = async () => {
      try {
        const res = await fetch('/api/mission-control/openclaw/sessions?session_type=subagent&status=active');
        if (res.ok) {
          const sessions = await res.json();
          setActiveSubAgents(sessions.length);
        }
      } catch (error) {
        console.error('Failed to load sub-agent count:', error);
      }
    };

    loadSubAgentCount();

    // Poll every 30 seconds (reduced from 10s to reduce load)
    const interval = setInterval(loadSubAgentCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectToOpenClaw = async (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the agent
    setConnectingAgentId(agent.id);

    try {
      const existingSession = agentOpenClawSessions[agent.id];

      if (existingSession) {
        // Disconnect
        const res = await fetch(`/api/mission-control/agents/${agent.id}/openclaw`, { method: 'DELETE' });
        if (res.ok) {
          setAgentOpenClawSession(agent.id, null);
        }
      } else {
        // Connect
        const res = await fetch(`/api/mission-control/agents/${agent.id}/openclaw`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setAgentOpenClawSession(agent.id, data.session as OpenClawSession);
        } else {
          const error = await res.json();
          console.error('Failed to connect to OpenClaw:', error);
          alert(`Failed to connect: ${error.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('OpenClaw connection error:', error);
    } finally {
      setConnectingAgentId(null);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    if (filter === 'all') return true;
    return agent.status === filter;
  });

  const getStatusDotColor = (status: AgentStatus) => {
    const colors = {
      standby: 'bg-mc-text-secondary/50',
      working: 'bg-mc-accent-green',
      offline: 'bg-gray-600',
    };
    return colors[status] || colors.standby;
  };

  return (
    <aside
      className={`bg-mc-bg border-r border-mc-border flex flex-col transition-all duration-300 ease-in-out ${
        isMinimized ? 'w-12' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-mc-border">
        <div className="flex items-center">
          <button
            onClick={toggleMinimize}
            className="p-1 rounded hover:bg-mc-bg-tertiary text-mc-text-secondary hover:text-mc-text transition-colors"
            aria-label={isMinimized ? 'Expand agents' : 'Minimize agents'}
          >
            {isMinimized ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
          {!isMinimized && (
            <>
              <span className="text-xs font-medium uppercase tracking-wide text-mc-text-secondary">Agents</span>
              <span className="bg-mc-bg-tertiary text-mc-text-secondary/70 text-[10px] px-1.5 py-0.5 rounded ml-2">
                {agents.length}
              </span>
            </>
          )}
        </div>

        {!isMinimized && (
          <>
            {/* Active Sub-Agents Counter */}
            {activeSubAgents > 0 && (
              <div className="mt-2 px-2 py-1.5 bg-green-500/5 border border-green-500/10 rounded">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500/60" />
                  <span className="text-mc-text-secondary/60">Sub-Agents</span>
                  <span className="text-green-400/70 ml-auto">{activeSubAgents}</span>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-1 mt-2">
              {(['all', 'working', 'standby'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-2 py-0.5 text-[10px] rounded uppercase tracking-wide ${
                    filter === tab
                      ? 'bg-mc-bg-tertiary text-mc-text-secondary font-medium border border-mc-border'
                      : 'text-mc-text-secondary/70 hover:bg-mc-bg-tertiary/60 hover:text-mc-text'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filteredAgents.map((agent, index) => {
          const openclawSession = agentOpenClawSessions[agent.id];

          if (isMinimized) {
            // Minimized view - just avatar
            return (
              <div key={agent.id} className="flex justify-center py-3">
                <button
                  onClick={() => {
                    setSelectedAgent(agent);
                    setEditingAgent(agent);
                  }}
                  className="relative group bg-transparent border-none"
                  title={`${agent.name} - ${agent.role}`}
                >
                  <span className="text-lg">{agent.avatar_emoji}</span>
                  {openclawSession && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-mc-bg-secondary" />
                  )}
                  {!!agent.is_master && (
                    <span className="absolute -top-1 -right-1 text-[10px] text-mc-accent-yellow/70">★</span>
                  )}
                  {/* Status indicator */}
                  <span
                    className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                      agent.status === 'working' ? 'bg-mc-accent-green' :
                      agent.status === 'standby' ? 'bg-mc-text-secondary/40' :
                      'bg-gray-600'
                    }`}
                  />
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-mc-bg text-mc-text text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-mc-border">
                    {agent.name}
                  </div>
                </button>
              </div>
            );
          }

          // Expanded view - full agent card
          const isConnecting = connectingAgentId === agent.id;
          const isSelected = selectedAgent?.id === agent.id;
          return (
            <div key={agent.id}>
              <div
                className={`w-full rounded-md transition-colors ${
                  isSelected
                    ? 'bg-mc-bg-tertiary border-l-2 border-mc-accent'
                    : 'hover:bg-mc-bg-tertiary/50'
                }`}
              >
                <button
                  onClick={() => {
                    setSelectedAgent(agent);
                    setEditingAgent(agent);
                  }}
                  className={`w-full flex items-center gap-3 py-2 pr-2 text-left bg-transparent ${
                    isSelected ? 'pl-2.5' : 'pl-3'
                  }`}
                >
                {/* Avatar */}
                <div className="text-lg relative flex-shrink-0">
                  {agent.avatar_emoji}
                  {openclawSession && (
                    <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-mc-bg-secondary" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-mc-text truncate">{agent.name}</span>
                    {!!agent.is_master && (
                      <span className="text-[10px] text-mc-accent-yellow">★</span>
                    )}
                  </div>
                  <div className="text-[11px] text-mc-text-secondary truncate flex items-center gap-1">
                    {agent.role}
                    {agent.source === 'gateway' && (
                      <span className="text-[9px] px-1 py-0 bg-blue-500/15 text-blue-400/80 rounded" title="Imported from Gateway">
                        GW
                      </span>
                    )}
                  </div>
                  {agent.model && (
                    <span className="inline-block text-[9px] px-1.5 py-0.5 mt-1 rounded bg-mc-accent-purple/15 text-mc-accent-purple font-medium truncate max-w-full">
                      {agent.model.includes('/') ? agent.model.split('/').pop() : agent.model}
                    </span>
                  )}
                </div>

                {/* Status dot */}
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(agent.status)}`}
                  title={agent.status}
                />
              </button>

              {/* OpenClaw Connect Button - show for master agents */}
              {!!agent.is_master && (
                <div className={`pb-1.5 pr-2 ${isSelected ? 'pl-[14px]' : 'pl-3'}`}>
                  <button
                    onClick={(e) => handleConnectToOpenClaw(agent, e)}
                    disabled={isConnecting}
                    className={`w-full flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-[10px] transition-colors border-0 outline-none ${
                      openclawSession
                        ? 'text-green-400/80 hover:text-green-400'
                        : 'text-mc-text-secondary/50 hover:text-mc-text-secondary/80'
                    }`}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : openclawSession ? (
                      <>
                        <Zap className="w-2.5 h-2.5" />
                        <span>OpenClaw Connected</span>
                      </>
                    ) : (
                      <>
                        <ZapOff className="w-2.5 h-2.5" />
                        <span>Connect to OpenClaw</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Agent / Discover Buttons */}
      {!isMinimized && (
        <div className="p-3 border-t border-mc-border space-y-1.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 hover:bg-mc-bg-tertiary rounded text-xs text-mc-text-secondary/70 hover:text-mc-text transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Agent
          </button>
          <button
            onClick={() => setShowDiscoverModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 hover:bg-mc-bg-tertiary rounded text-xs text-mc-text-secondary/70 hover:text-mc-text transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Import from Gateway
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <AgentModal onClose={() => setShowCreateModal(false)} workspaceId={workspaceId} />
      )}
      {editingAgent && (
        <AgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          workspaceId={workspaceId}
        />
      )}
      {showDiscoverModal && (
        <DiscoverAgentsModal
          onClose={() => setShowDiscoverModal(false)}
          workspaceId={workspaceId}
        />
      )}
    </aside>
  );
}
