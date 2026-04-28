import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { env } from '../config/env';
import { AuthResult } from '../services/auth';
import { IssueRequest, RequestComment, addChatMessage, getRequestDetail, listRequests } from '../services/requests';
import { colors } from '../theme/colors';

type ChatScreenProps = {
  auth: AuthResult;
};

const HEADER_TOP_PADDING = (StatusBar.currentHeight ?? 0) + 12;
const TAB_BAR_HEIGHT = 58;
const COMPOSER_KEYBOARD_GAP = 18;

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('kk-KZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getTime = (comment: RequestComment) => new Date(comment.createdAt ?? 0).getTime();

export function ChatScreen({ auth }: ChatScreenProps) {
  const [requests, setRequests] = React.useState<IssueRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [activeRequest, setActiveRequest] = React.useState<IssueRequest | null>(null);
  const [threadLoading, setThreadLoading] = React.useState(false);
  const [messageText, setMessageText] = React.useState('');
  const [sendBusy, setSendBusy] = React.useState(false);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);
  const messagesRef = React.useRef<ScrollView | null>(null);
  const composerKeyboardOffset = Math.max(keyboardHeight - TAB_BAR_HEIGHT - COMPOSER_KEYBOARD_GAP, 0);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const result = await listRequests(auth.accessToken, { page: 1, limit: 80 });
        if (active) setRequests(result.items);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [auth.accessToken]);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const filteredRequests = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((request) =>
      [request.title, request.description, request.category?.name, request.city?.name, request.organization?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [requests, search]);

  const messages = React.useMemo(
    () => [...(activeRequest?.comments ?? [])].filter((comment) => comment.source === 'chat').sort((a, b) => getTime(a) - getTime(b)),
    [activeRequest?.comments],
  );

  React.useEffect(() => {
    if (messages.length) {
      requestAnimationFrame(() => messagesRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length, activeRequest?.id]);

  const openThread = async (request: IssueRequest) => {
    setActiveRequest(request);
    setMessageText('');
    setThreadLoading(true);
    try {
      const detail = await getRequestDetail(auth.accessToken, request.id);
      setActiveRequest(detail);
    } finally {
      setThreadLoading(false);
    }
  };

  const canSend = Boolean(activeRequest?.organizationId || activeRequest?.organization);

  const submitMessage = async () => {
    if (!activeRequest || !messageText.trim() || !canSend || sendBusy) return;
    const text = messageText.trim();
    setSendBusy(true);
    try {
      await addChatMessage(auth.accessToken, activeRequest.id, text);
      const detail = await getRequestDetail(auth.accessToken, activeRequest.id);
      setActiveRequest(detail);
      setRequests((current) => current.map((item) => (item.id === detail.id ? { ...item, updatedAt: detail.updatedAt } : item)));
      setMessageText('');
    } finally {
      setSendBusy(false);
    }
  };

  const renderDialogList = () => (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>AIQala</Text>
          <Text style={styles.title}>Чат</Text>
        </View>
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{requests.length}</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Өтінімді іздеу" placeholderTextColor={colors.muted} style={styles.searchInput} />
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Чат жүктелуде...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.dialogList}>
          {filteredRequests.map((request) => {
            const chatCount = (request.comments ?? []).filter((comment) => comment.source === 'chat').length;
            return (
              <Pressable key={request.id} style={styles.dialogCard} onPress={() => void openThread(request)}>
                <View style={styles.dialogIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.accent} />
                </View>
                <View style={styles.dialogCopy}>
                  <Text style={styles.dialogTitle} numberOfLines={2}>{request.title}</Text>
                  <Text style={styles.dialogMeta} numberOfLines={1}>{request.organization?.name ?? 'Ұйым әлі тағайындалмаған'}</Text>
                  <Text style={styles.dialogFooter}>{chatCount ? `${chatCount} хабар` : 'Хабар жоқ'} {request.updatedAt ? `• ${formatDate(request.updatedAt)}` : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            );
          })}
          {!filteredRequests.length ? <Text style={styles.emptyText}>Чат табылмады</Text> : null}
        </ScrollView>
      )}
    </View>
  );

  if (!activeRequest) {
    return renderDialogList();
  }

  return (
    <View style={styles.threadScreen}>
      <View style={styles.threadHeader}>
        <Pressable style={styles.headerButton} onPress={() => setActiveRequest(null)}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.threadTitleBlock}>
          <Text style={styles.threadTitle} numberOfLines={1}>{activeRequest.title}</Text>
          <Text style={styles.threadSubtitle} numberOfLines={1}>{activeRequest.organization?.name ?? 'Ұйым тағайындалмаған'}</Text>
        </View>
        <View style={styles.headerButton}>
          <Ionicons name="document-text-outline" size={20} color={colors.accent} />
        </View>
      </View>

      <View style={styles.requestPreview}>
        <Text style={styles.requestPreviewText} numberOfLines={2}>{activeRequest.description}</Text>
      </View>

      {threadLoading ? <ActivityIndicator color={colors.accent} style={styles.threadLoader} /> : null}

      <ScrollView ref={messagesRef} contentContainerStyle={styles.messagesContent}>
        {messages.map((comment) => {
          const mine = comment.authorUserId === auth.user.id;
          const authorName = mine
            ? 'Сіз'
            : comment.authorOrganization?.name ?? comment.authorUser?.fullName ?? activeRequest.organization?.name ?? 'Белгісіз';
          const avatarUrl = comment.authorUser?.avatarUrl ?? comment.authorOrganization?.logoUrl ?? (mine ? auth.user.avatarUrl : null);
          return (
            <View key={comment.id} style={[styles.messageRow, mine && styles.messageRowMine]}>
              {!mine ? <Avatar name={authorName} uri={avatarUrl} /> : null}
              <View style={[styles.messageBubble, mine && styles.messageBubbleMine]}>
                <View style={styles.messageMeta}>
                  <Text style={[styles.messageAuthor, mine && styles.messageAuthorMine]}>{authorName}</Text>
                  <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{formatDate(comment.createdAt)}</Text>
                </View>
                <Text style={[styles.messageText, mine && styles.messageTextMine]}>{comment.text}</Text>
              </View>
              {mine ? <Avatar name={authorName} uri={auth.user.avatarUrl} /> : null}
            </View>
          );
        })}
        {!messages.length ? <Text style={styles.emptyText}>Әзірге хабар жоқ. Бірінші хабарды жазыңыз.</Text> : null}
      </ScrollView>

      {!canSend ? (
        <View style={styles.lockedComposer}>
          <Text style={styles.lockedText}>Чат ұйым тағайындалғаннан кейін ашылады.</Text>
        </View>
      ) : (
        <>
          {composerKeyboardOffset > 0 ? <View style={[styles.keyboardCover, { height: composerKeyboardOffset }]} /> : null}
          <View style={[styles.composer, { bottom: composerKeyboardOffset }]}>
            <TextInput
              multiline
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Хабар жазыңыз..."
              placeholderTextColor={colors.muted}
              style={styles.composerInput}
            />
            <Pressable
              disabled={!messageText.trim() || sendBusy}
              onPress={() => void submitMessage()}
              style={[styles.sendButton, (!messageText.trim() || sendBusy) && styles.disabled]}
            >
              {sendBusy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="send" size={18} color={colors.white} />}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function Avatar({ name, uri }: { name: string; uri?: string | null }) {
  return (
    <View style={styles.avatar}>
      {uri ? (
        <Image source={{ uri: `${env.apiUrl}${uri}` }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarText}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 72,
    paddingTop: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  counterPill: {
    minWidth: 44,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: { color: colors.accent, fontSize: 15, fontWeight: '900' },
  searchBox: {
    marginHorizontal: 18,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: colors.text, fontWeight: '700' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.muted, fontWeight: '700' },
  dialogList: { padding: 18, gap: 12 },
  dialogCard: {
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  dialogIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dialogCopy: { flex: 1 },
  dialogTitle: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  dialogMeta: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 4 },
  dialogFooter: { color: colors.accent, fontSize: 12, fontWeight: '800', marginTop: 6 },
  emptyText: { color: colors.muted, textAlign: 'center', fontWeight: '800', marginTop: 30 },
  threadScreen: { flex: 1, backgroundColor: colors.background },
  threadHeader: {
    minHeight: 64 + HEADER_TOP_PADDING,
    paddingTop: HEADER_TOP_PADDING,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  threadTitleBlock: { flex: 1 },
  threadTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  threadSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 3 },
  requestPreview: { margin: 12, borderRadius: 16, backgroundColor: colors.accentSoft, padding: 12 },
  requestPreviewText: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  threadLoader: { marginTop: 8 },
  messagesContent: { paddingHorizontal: 12, paddingBottom: 120, gap: 10 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowMine: { justifyContent: 'flex-end' },
  avatar: { width: 34, height: 34, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  messageBubble: { maxWidth: '76%', borderRadius: 18, borderBottomLeftRadius: 6, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 10 },
  messageBubbleMine: { borderBottomLeftRadius: 18, borderBottomRightRadius: 6, backgroundColor: colors.accent, borderColor: colors.accent },
  messageMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  messageAuthor: { color: colors.accent, fontSize: 12, fontWeight: '900' },
  messageAuthorMine: { color: colors.white },
  messageTime: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  messageTimeMine: { color: 'rgba(255,255,255,0.72)' },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  messageTextMine: { color: colors.white },
  lockedComposer: { minHeight: 64, borderTopWidth: 1, borderTopColor: colors.border, padding: 12, justifyContent: 'center' },
  lockedText: { color: colors.muted, textAlign: 'center', fontWeight: '800' },
  keyboardCover: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white },
  composer: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: 72,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontWeight: '600',
  },
  sendButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
});
