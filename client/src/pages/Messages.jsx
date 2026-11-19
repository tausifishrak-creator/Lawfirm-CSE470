// /messages — In-App Messaging System between clients and lawyers organized by case
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EmptyState, PageHeader, PageStatus, StatusBadge } from '../components/ui';
import { timeAgo, dateTime } from '../utils/format';

const POLL_INTERVAL_MS = 3000;

export default function Messages() {
    const { user } = useAuth();
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const activeCaseId = params.get('caseId') ? Number(params.get('caseId')) : null;

    const [conversations, setConversations] = useState([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [convsError, setConvsError] = useState(null);

    const [activeCase, setActiveCase] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingChat, setLoadingChat] = useState(false);
    const [chatError, setChatError] = useState(null);

    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);

    const chatContainerRef = useRef(null);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    // Load conversations list
    const loadConversations = useCallback(async (silent = false) => {
        if (!silent) setLoadingConvs(true);
        try {
            const data = await api.get('/messages/conversations');
            setConversations(data.conversations || []);
            setConvsError(null);
        } catch (err) {
            setConvsError(err.message);
        } finally {
            if (!silent) setLoadingConvs(false);
        }
    }, []);

    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Scroll to bottom of chat
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    // Load full messages for active case
    const loadChat = useCallback(async (caseId) => {
        if (!caseId) {
            setActiveCase(null);
            setMessages([]);
            return;
        }
        setLoadingChat(true);
        setChatError(null);
        try {
            const data = await api.get(`/messages/cases/${caseId}`);
            setActiveCase(data.case);
            setMessages(data.messages || []);
            // Update unread count in conversations list
            setConversations((prev) =>
                prev.map((c) => (c.case_id === caseId ? { ...c, unread: 0 } : c))
            );
            setTimeout(scrollToBottom, 50);
        } catch (err) {
            setChatError(err.message);
        } finally {
            setLoadingChat(false);
        }
    }, []);

    useEffect(() => {
        loadChat(activeCaseId);
    }, [activeCaseId, loadChat]);

    // Polling for incoming messages in the active chat every 3 seconds
    useEffect(() => {
        if (!activeCaseId) return undefined;

        const timer = setInterval(async () => {
            const currentMsgs = messagesRef.current;
            const lastId = currentMsgs.length > 0 ? currentMsgs[currentMsgs.length - 1].message_id : 0;
            try {
                const data = await api.get(`/messages/cases/${activeCaseId}?afterId=${lastId}`);
                if (data.messages && data.messages.length > 0) {
                    setMessages((prev) => [...prev, ...data.messages]);
                    setTimeout(scrollToBottom, 50);
                    // Refresh conversation previews quietly
                    loadConversations(true);
                }
            } catch {
                // Ignore transient polling network errors
            }
        }, POLL_INTERVAL_MS);

        return () => clearInterval(timer);
    }, [activeCaseId, loadConversations]);

    // Send a message
    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const text = inputText.trim();
        if (!text || !activeCaseId || sending) return;

        setSending(true);
        try {
            await api.post(`/messages/cases/${activeCaseId}`, { message: text });
            setInputText('');

            // Fetch latest messages
            const currentMsgs = messagesRef.current;
            const lastId = currentMsgs.length > 0 ? currentMsgs[currentMsgs.length - 1].message_id : 0;
            const data = await api.get(`/messages/cases/${activeCaseId}?afterId=${lastId}`);
            if (data.messages && data.messages.length > 0) {
                setMessages((prev) => [...prev, ...data.messages]);
            }
            setTimeout(scrollToBottom, 50);
            loadConversations(true);
        } catch (err) {
            toast.error(err.message || 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const selectConversation = (caseId) => {
        setParams({ caseId: String(caseId) });
    };

    return (
        <main>
            <section className="dashboard dashboard_section">
                <PageHeader title="💬 In-App Messages">
                    <p>Communicate directly and securely with your {user.role === 'client' ? 'lawyer' : 'client'} regarding your case.</p>
                </PageHeader>

                <PageStatus error={convsError} loading={loadingConvs && conversations.length === 0} />

                {!loadingConvs && conversations.length === 0 ? (
                    <EmptyState icon="💬" title="No conversations yet">
                        Messages will appear here once a case is accepted by a lawyer.
                    </EmptyState>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2fr', gap: '24px', alignItems: 'start' }}>
                        {/* Conversation list */}
                        <div className="conversation_list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h3 style={{ color: '#f1f5f9', fontSize: '1.1rem', marginBottom: '4px' }}>Active Cases</h3>
                            {conversations.map((conv) => {
                                const isSelected = conv.case_id === activeCaseId;
                                return (
                                    <div
                                        key={conv.case_id}
                                        onClick={() => selectConversation(conv.case_id)}
                                        className={`conversation_item ${conv.unread > 0 ? 'conv_unread' : ''}`}
                                        style={{
                                            border: isSelected ? '1px solid #d4a843' : undefined,
                                            background: isSelected ? 'rgba(212, 168, 67, 0.1)' : undefined,
                                        }}
                                    >
                                        <div className="conv_avatar">
                                            {(conv.other_name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="conv_info">
                                            <h3>{conv.title}</h3>
                                            <p className="conv_partner">
                                                With: <strong>{conv.other_name}</strong>
                                            </p>
                                            <p className="conv_preview">
                                                {conv.last_message
                                                    ? conv.last_message.slice(0, 60) + (conv.last_message.length > 60 ? '...' : '')
                                                    : <em style={{ color: '#64748b' }}>No messages yet — start chatting!</em>}
                                            </p>
                                        </div>
                                        <div className="conv_meta">
                                            {conv.last_time && (
                                                <span className="conv_time">{timeAgo(conv.last_time)}</span>
                                            )}
                                            {conv.unread > 0 && (
                                                <span className="card_badge">{conv.unread}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Active chat window */}
                        <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '20px', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
                            {activeCaseId && activeCase ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px', marginBottom: '16px' }}>
                                        <div>
                                            <h2 style={{ fontSize: '1.25rem', color: '#f1f5f9', margin: 0 }}>
                                                💬 {activeCase.title}
                                            </h2>
                                            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                                                Conversation with <strong style={{ color: '#d4a843' }}>{activeCase.other_name}</strong>
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <StatusBadge status={activeCase.status} />
                                            <Link to={`/cases/${activeCase.case_id}/documents`} className="btn_approve btn_save" style={{ fontSize: '0.85rem' }}>
                                                📂 Documents
                                            </Link>
                                        </div>
                                    </div>

                                    <PageStatus error={chatError} loading={loadingChat && messages.length === 0} />

                                    {/* Messages container */}
                                    <div
                                        ref={chatContainerRef}
                                        className="chat_container"
                                        style={{ flex: 1, minHeight: '360px', maxHeight: '440px', overflowY: 'auto', marginBottom: '16px' }}
                                    >
                                        {messages.length === 0 ? (
                                            <div className="empty_state" style={{ padding: '30px', margin: 'auto' }}>
                                                <div className="empty_state_icon">✉️</div>
                                                <h3>No messages yet</h3>
                                                <p>Send a message below to start the conversation!</p>
                                            </div>
                                        ) : (
                                            messages.map((m) => (
                                                <div
                                                    key={m.message_id}
                                                    className={`chat_bubble ${m.is_mine ? 'chat_sent' : 'chat_received'}`}
                                                >
                                                    <div className="chat_avatar_row">
                                                        <span className={`chat_avatar ${m.is_mine ? 'avatar_sent' : 'avatar_received'}`}>
                                                            {(m.sender_name || 'U').charAt(0).toUpperCase()}
                                                        </span>
                                                        <span className="chat_sender">
                                                            {m.is_mine ? 'You' : m.sender_name}
                                                        </span>
                                                    </div>
                                                    <div className="chat_text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                        {m.message}
                                                    </div>
                                                    <div className="chat_time">
                                                        {dateTime(m.created_at)}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Send message form */}
                                    <form onSubmit={handleSend} className="chat_form" style={{ marginTop: 'auto' }}>
                                        <div className="chat_input_row" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <textarea
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                                                rows="2"
                                                style={{ flex: 1, background: '#fff', color: '#0f172a', borderRadius: '8px', padding: '10px 14px', border: '1px solid #cbd5e1', resize: 'none', fontSize: '0.95rem' }}
                                                disabled={sending}
                                            />
                                            <button
                                                type="submit"
                                                className="btn_primary"
                                                disabled={sending || !inputText.trim()}
                                                style={{ padding: '12px 24px', height: 'fit-content' }}
                                            >
                                                {sending ? '...' : 'Send'}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="empty_state" style={{ margin: 'auto' }}>
                                    <div className="empty_state_icon">👈</div>
                                    <h3>Select a case conversation</h3>
                                    <p>Choose one of your active cases on the left to read or send messages.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
