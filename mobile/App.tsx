import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  useColorScheme,
  Dimensions,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { LevitationClient, ConnectionStatus } from './src/client';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = 260;

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [instanceId, setInstanceId] = useState('');
  const [showInstanceInput, setShowInstanceInput] = useState(false);
  const [tempInstanceId, setTempInstanceId] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [cascadesByPort, setCascadesByPort] = useState<Record<string, any[]>>({});
  const [selectedWorkspace, setSelectedWorkspace] = useState<any | null>(null);
  const [chatText, setChatText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [isSending, setIsSending] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const pendingRequestsRef = useRef<Map<string, string>>(new Map());

  const clientRef = useRef<LevitationClient | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  if (!clientRef.current) {
    clientRef.current = new LevitationClient(
      (status) => setConnectionStatus(status),
      (msg) => addLog(msg),
      (message) => handleMessage(message)
    );
  }

  const handleMessage = (message: any) => {
    if (message.type === 'EnumerateWorkspacesResponse') {
      const newWorkspaces = message.body || [];
      setWorkspaces(newWorkspaces);
      // Fetch cascades for each workspace
      newWorkspaces.forEach((ws: any) => {
        sendCommand('GetAllCascadeTrajectoriesRequest', { port: ws.port });
      });
    } else if (message.type === 'GetAllCascadeTrajectoriesResponse') {
      const port = message.body?.port;
      const trajectories = message.body?.trajectorySummaries || {};
      const cascadeList = Object.keys(trajectories).map(id => ({
        id,
        ...trajectories[id]
      }));
      if (port) {
        setCascadesByPort(prev => ({ ...prev, [port]: cascadeList }));
      }
    } else if (message.type === 'StartCascadeResponse') {
      const cascadeId = message.body?.cascadeId;
      const port = message.body?.port;
      const requestId = message.id;
      const pendingMessage = requestId ? pendingRequestsRef.current.get(requestId) : null;

      if (cascadeId && pendingMessage && selectedWorkspace) {
        sendCommand('SendUserCascadeMessageRequest', {
          text: pendingMessage,
          cascade: cascadeId,
          port: selectedWorkspace.port
        });
        if (requestId) pendingRequestsRef.current.delete(requestId);
        setIsSending(false);
        setChatText('');

        // Optimistically add to cascades list if we have the port
        if (port) {
          sendCommand('GetAllCascadeTrajectoriesRequest', { port });
        }
      }
    } else if (message.type === 'SendUserCascadeMessageResponse') {
      addLog('Message sent successfully');
      setIsSending(false);
      const port = message.body?.port;
      if (port) {
        sendCommand('GetAllCascadeTrajectoriesRequest', { port });
      }
    } else if (message.type === 'error') {
      addLog(`Error: ${message.body}${message.description ? ` (${message.description})` : ''}`);
      setIsSending(false);
      if (message.id) pendingRequestsRef.current.delete(message.id);
    }
  };

  // Load instance ID on start
  useEffect(() => {
    const loadInstanceId = async () => {
      if (clientRef.current) {
        const storedId = await clientRef.current.getInstanceId();
        if (storedId) {
          setInstanceId(storedId);
          setTempInstanceId(storedId);
        }
      }
    };
    loadInstanceId();
  }, []);

  // Clear workspaces on disconnect
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      setWorkspaces([]);
      setCascadesByPort({});
    }
  }, [connectionStatus]);

  // Periodic refresh when in foreground
  useEffect(() => {
    // let interval: any;

    const startInterval = () => {
      if (connectionStatus === 'connected') {
        sendCommand('EnumerateWorkspacesRequest');
      }
      /*
      interval = setInterval(() => {
        if (connectionStatus === 'connected') {
          sendCommand('EnumerateWorkspacesRequest');
        }
      }, 60000); // 1 minute
      */
    };

    const stopInterval = () => {
      /*
      if (interval) {
        clearInterval(interval);
      }
      */
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        startInterval();
      } else {
        stopInterval();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    if (AppState.currentState === 'active') {
      startInterval();
    }

    return () => {
      subscription.remove();
      stopInterval();
    };
  }, [connectionStatus]);

  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);

  const handleConnectToggle = async () => {
    if (connectionStatus === 'connected') {
      clientRef.current?.disconnect();
      return;
    }

    if (connectionStatus === 'connecting') {
      return;
    }

    if (!instanceId) {
      setShowInstanceInput(true);
    } else {
      clientRef.current?.connect(instanceId);
    }
  };

  const saveAndConnect = async () => {
    if (tempInstanceId.trim()) {
      const id = tempInstanceId.trim();
      setInstanceId(id);
      await clientRef.current?.saveInstanceId(id);
      setShowInstanceInput(false);
      clientRef.current?.connect(id);
    }
  };

  const sendCommand = (type: string, body: any = {}): string | null => {
    return clientRef.current?.sendCommand(type, body) || null;
  };

  const handleSendMessage = () => {
    if (!chatText.trim() || !selectedWorkspace || isSending) return;

    setIsSending(true);
    const requestId = sendCommand('StartCascadeRequest', { port: selectedWorkspace.port });
    if (requestId) {
      pendingRequestsRef.current.set(requestId, chatText);
    } else {
      setIsSending(false);
    }
  };

  const getConnectButtonConfig = () => {
    switch (connectionStatus) {
      case 'connecting':
        return { text: 'Connecting', color: isDarkMode ? '#475569' : '#94a3b8', disabled: true };
      case 'connected':
        return { text: 'Connected', color: '#10b981', disabled: false };
      case 'disconnected':
      default:
        return { text: 'Connect', color: '#3b82f6', disabled: false };
    }
  };

  const btnConfig = getConnectButtonConfig();

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    flex: 1,
  };

  const textStyle = {
    color: isDarkMode ? '#f8fafc' : '#0f172a',
  };

  const sidebarStyle = {
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRightColor: isDarkMode ? '#334155' : '#e2e8f0',
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0', backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Text style={[styles.menuButtonText, textStyle]}>☰</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, textStyle]}>Levitation</Text>
          <TouchableOpacity
            onPress={() => setSelectedWorkspace(null)}
            style={[styles.logsHeaderButton, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
          >
            <Text style={[styles.logsHeaderButtonText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>Logs</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleConnectToggle}
          disabled={btnConfig.disabled}
          style={[
            styles.connectButton,
            { backgroundColor: btnConfig.color, opacity: btnConfig.disabled ? 0.7 : 1 }
          ]}
        >
          {connectionStatus === 'connecting' && (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.connectButtonText}>
            {btnConfig.text}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {/* Sidebar */}
        {isSidebarVisible && (
          <View style={[styles.sidebar, sidebarStyle]}>
            <View style={styles.sidebarHeader}>
              <Text style={[styles.sidebarTitle, textStyle]}>Workspaces</Text>
              <TouchableOpacity
                onPress={() => sendCommand('EnumerateWorkspacesRequest')}
                disabled={connectionStatus !== 'connected'}
                style={[styles.refreshButton, { opacity: connectionStatus === 'connected' ? 1 : 0.5 }]}
              >
                <View style={[styles.elegantRefreshCircle, { borderColor: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                  <View style={[styles.elegantRefreshDot, { backgroundColor: isDarkMode ? '#f8fafc' : '#0f172a' }]} />
                </View>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sidebarContent}>
              {workspaces.length === 0 ? (
                <Text style={{ color: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                  {connectionStatus === 'connected' ? 'No active workspaces' : 'Connect to see workspaces'}
                </Text>
              ) : (
                workspaces.map((ws, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelectedWorkspace(ws)}
                    style={[
                      styles.workspaceItem,
                      { borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' },
                      selectedWorkspace?.port === ws.port && { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }
                    ]}
                  >
                    <Text style={[styles.workspaceName, textStyle]}>{ws.workspaceName}</Text>
                    {cascadesByPort[ws.port] && cascadesByPort[ws.port].length > 0 && (
                      <Text style={[styles.cascadeCount, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                        {cascadesByPort[ws.port].length} cascades
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {selectedWorkspace ? (
            <View style={styles.chatContainer}>
              <View style={styles.chatHeader}>
                <View style={styles.workspaceSelectContainer}>
                  <Text style={[styles.chatTitle, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>Start new conversation in </Text>
                  <TouchableOpacity
                    style={styles.workspaceDropdown}
                    onPress={() => setIsWorkspaceMenuOpen(true)}
                  >
                    <Text style={[styles.dropdownIcon, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>⌵</Text>
                    <Text style={[styles.selectedWorkspaceName, textStyle]}>{selectedWorkspace.workspaceName}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.chatInputContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
                <TextInput
                  style={[
                    styles.chatInput,
                    {
                      color: textStyle.color,
                      height: Math.max(100, inputHeight),
                      backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
                    }
                  ]}
                  placeholder="Ask a question..."
                  placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
                  multiline
                  value={chatText}
                  onChangeText={setChatText}
                  onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                />
                <View style={styles.chatInputFooter}>
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={!chatText.trim() || isSending}
                    style={[
                      styles.sendButton,
                      { opacity: (!chatText.trim() || isSending) ? 0.5 : 1 }
                    ]}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.sendButtonText}>➔</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={[
                styles.card,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  shadowColor: '#000',
                }
              ]}>
                <View style={styles.statusHeader}>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: connectionStatus === 'connected' ? '#10b981' : (connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444') }
                  ]} />
                  <Text style={[styles.cardTitle, textStyle]}>System Status</Text>
                </View>

                <Text style={[styles.instanceText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                  {instanceId ? `Instance: ${instanceId}` : 'No instance connected'}
                </Text>

                <View style={styles.buttonGrid}>
                  <TouchableOpacity
                    style={[styles.cmdButton, { opacity: connectionStatus === 'connected' ? 1 : 0.5 }]}
                    onPress={() => sendCommand('EnumerateWorkspacesRequest')}
                    disabled={connectionStatus !== 'connected'}
                  >
                    <Text style={styles.cmdButtonText}>List Workspaces</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cmdButton, { opacity: connectionStatus === 'connected' ? 1 : 0.5 }]}
                    onPress={() => sendCommand('GetWorkspaceInfosRequest')}
                    disabled={connectionStatus !== 'connected'}
                  >
                    <Text style={styles.cmdButtonText}>Workspace Infos</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.logContainer, { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9' }]}>
                  <View style={styles.logHeader}>
                    <Text style={[styles.logTitle, { color: isDarkMode ? '#64748b' : '#94a3b8' }]}>Terminal Output</Text>
                    <TouchableOpacity onPress={() => setLogs([])}>
                      <Text style={{ fontSize: 10, color: '#3b82f6' }}>CLEAR</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.logScroll}>
                    {logs.length === 0 ? (
                      <Text style={[styles.logText, { color: isDarkMode ? '#475569' : '#cbd5e1', fontStyle: 'italic' }]}>
                        Waiting for connection...
                      </Text>
                    ) : (
                      logs.map((log, i) => (
                        <Text key={i} style={[styles.logText, { color: log.includes('Error') ? '#ef4444' : (isDarkMode ? '#94a3b8' : '#64748b') }]}>
                          {`> ${log}`}
                        </Text>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      {/* Instance ID Input Modal */}
      <Modal
        visible={showInstanceInput}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' }]}>
            <Text style={[styles.modalTitle, textStyle]}>Connect to Instance</Text>
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
              Enter your Instance ID to manage your workspaces.
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  width: '100%',
                  marginBottom: 20
                }
              ]}
              value={tempInstanceId}
              onChangeText={setTempInstanceId}
              placeholder="Instance ID"
              placeholderTextColor={isDarkMode ? '#475569' : '#94a3b8'}
              autoFocus={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]}
                onPress={() => setShowInstanceInput(false)}
              >
                <Text style={[styles.modalButtonText, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#3b82f6' }]}
                onPress={saveAndConnect}
              >
                <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Workspace Switcher Modal */}
      <Modal
        visible={isWorkspaceMenuOpen}
        transparent={true}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsWorkspaceMenuOpen(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, textStyle]}>Switch Workspace</Text>
            <ScrollView style={{ width: '100%' }}>
              {workspaces.map((ws, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.workspaceMenuItem,
                    { borderBottomColor: isDarkMode ? '#334155' : '#f1f5f9' },
                    selectedWorkspace?.port === ws.port && { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }
                  ]}
                  onPress={() => {
                    setSelectedWorkspace(ws);
                    setIsWorkspaceMenuOpen(false);
                  }}
                >
                  <Text style={[styles.workspaceMenuText, textStyle]}>{ws.workspaceName}</Text>
                  <Text style={{ color: isDarkMode ? '#475569' : '#94a3b8', fontSize: 10 }}>{ws.port}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', marginTop: 20, width: '100%' }]}
              onPress={() => setIsWorkspaceMenuOpen(false)}
            >
              <Text style={[styles.modalButtonText, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    elevation: 2,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: 16,
    padding: 4,
  },
  menuButtonText: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logsHeaderButton: {
    marginLeft: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  logsHeaderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  connectButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    padding: 24,
    borderRightWidth: 1,
    height: '100%',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  refreshButton: {
    padding: 4,
  },
  elegantRefreshCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  elegantRefreshDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  workspaceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    width: '100%',
  },
  workspaceName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  cascadeCount: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  workspaceInfo: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  sidebarContent: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 600,
    padding: 32,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  instanceText: {
    fontSize: 14,
    marginBottom: 32,
    fontFamily: 'monospace',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  cmdButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    minWidth: 160,
    alignItems: 'center',
  },
  cmdButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  logContainer: {
    width: '100%',
    height: 350,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.1)',
  },
  logTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  logScroll: {
    flex: 1,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  chatContainer: {
    flex: 1,
    padding: 40,
  },
  chatHeader: {
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workspaceSelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#64748b',
  },
  workspaceDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedWorkspaceName: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 4,
  },
  dropdownIcon: {
    fontSize: 14,
    marginTop: 4,
  },
  chatInputContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  chatInput: {
    fontSize: 16,
    lineHeight: 24,
    padding: 12,
    borderRadius: 12,
    textAlignVertical: 'top',
  },
  chatInputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0066ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  workspaceMenuItem: {
    padding: 16,
    borderBottomWidth: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workspaceMenuText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;


