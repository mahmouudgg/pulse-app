import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Mic, Square, Trash2, AlertCircle, Image as ImageIcon, Video, 
  MapPin, Navigation, Search, Loader2, BarChart2, Plus, 
  FileText, MoreHorizontal, SlidersHorizontal, Check, Music2,
  Quote, AlignLeft, Crop, Play, Pause, ShieldAlert
} from 'lucide-react';
import { startRecording, stopRecording } from '../utils/audioRecorder';
import { compressImageToBase64 } from '../utils/imageCompressor';
import { moderationService } from '../services/moderationService';
import { locationService, POPULAR_LOCATIONS } from '../services/locationService';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { DEFAULT_AVATAR } from '../utils/defaultAvatar';
import { soundService } from '../services/soundService';
import { sanitizeInput } from '../utils/securityCrypto';
import { hapticsService } from '../services/hapticsService';
import MentionAutocomplete from './MentionAutocomplete';
import GifPickerModal from './GifPickerModal';
import MusicPickerModal from './MusicPickerModal';
import QuotePickerModal from './QuotePickerModal';
import DraftsPage from './DraftsPage';
import ImageEditorModal from './ImageEditorModal';
import { cloudinaryService } from '../services/cloudinaryService';
import { draftService } from '../services/draftService';
import { processVideoPreUpload, formatVideoDuration } from '../utils/videoOptimizer';

export const POPULAR_TOPICS = [
  'تقنية',
  'برمجة وتطوير',
  'ذكاء اصطناعي',
  'ريادة أعمال',
  'اقتصاد واستثمار',
  'تصميم وفنون',
  'فلسفة وفكر',
  'أدب وكتب',
  'سينما وأفلام',
  'علوم وفضاء',
  'ألعاب',
  'رياضة'
];

export default function ComposeModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  onPublish,
  quotePost = null,
  initialMusic = null,
  initialMedia = null
}) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const { showToast } = useToast();

  const isProUser = Boolean(currentUser?.isVerified || currentUser?.isFounder || currentUser?.isPro);
  const maxChars = isProUser ? 4000 : 500;
  const maxRecordingSeconds = isProUser ? 120 : 30;

  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedVideo, setAttachedVideo] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPoster, setVideoPoster] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [attachedGif, setAttachedGif] = useState(null);
  const [attachedMusic, setAttachedMusic] = useState(null);
  const [activeQuotePost, setActiveQuotePost] = useState(quotePost || null);
  const [isGifModalOpen, setIsGifModalOpen] = useState(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);
  const [playingMusicId, setPlayingMusicId] = useState(null);

  useEffect(() => {
    const unsub = soundService.subscribe((state) => {
      setPlayingMusicId(state.playingId);
    });
    return () => unsub();
  }, []);
  const [isQuotePickerOpen, setIsQuotePickerOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCrossPost, setIsCrossPost] = useState(false);
  const [chainedThreads, setChainedThreads] = useState([]);
  const [micError, setMicError] = useState('');
  const [validationError, setValidationError] = useState('');

  // Location Geotagging state
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locSearchQuery, setLocSearchQuery] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Poll state (PULSE Style)
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Threads "Post options" bottom sheet state
  const [showPostOptionsSheet, setShowPostOptionsSheet] = useState(false);
  const [replyPermission, setReplyPermission] = useState('anyone');
  const [reviewReplies, setReviewReplies] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);

  const [mentionQuery, setMentionQuery] = useState(null);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const moreMenuRef = useRef(null);

  // Sync initial quotePost prop
  useEffect(() => {
    if (quotePost) {
      setActiveQuotePost(quotePost);
    }
  }, [quotePost]);

  // Sync initial music if provided
  useEffect(() => {
    if (initialMusic) {
      setAttachedMusic(initialMusic);
    }
  }, [initialMusic]);

  // Sync initial media if provided
  useEffect(() => {
    if (initialMedia) {
      setAttachedImage(initialMedia);
    }
  }, [initialMedia]);

  // Click outside listener for the 5th icon more menu
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMoreMenu]);

  // Handle content input and @mention auto-detect
  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    const selStart = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, selStart);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\u0600-\u06FF]*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (user) => {
    const textarea = textareaRef.current;
    const selStart = textarea ? textarea.selectionStart : content.length;
    const textBeforeCursor = content.slice(0, selStart);
    const textAfterCursor = content.slice(selStart);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\u0600-\u06FF]*)$/);
    if (match) {
      const replaceStart = match.index;
      const newText = content.slice(0, replaceStart) + `@${user.username} ` + textAfterCursor;
      setContent(newText);
    } else {
      setContent((prev) => `${prev} @${user.username} `);
    }
    setMentionQuery(null);
    if (textarea) textarea.focus();
  };

  // Chained threads handler
  const handleAddThread = () => {
    hapticsService.light?.();
    setChainedThreads((prev) => [
      ...prev,
      { id: 'chain-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6), content: '' }
    ]);
  };

  const handleUpdateChainedThread = (id, newContent) => {
    setChainedThreads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content: newContent } : item))
    );
  };

  const handleRemoveChainedThread = (id) => {
    hapticsService.light?.();
    setChainedThreads((prev) => prev.filter((item) => item.id !== id));
  };

  // Recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= maxRecordingSeconds) {
            handleStopRecording();
            return maxRecordingSeconds;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, maxRecordingSeconds]);

  // Drafts system
  const uid = currentUser?.uid || null;
  const draftIdRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const savedLabelTimerRef = useRef(null);
  const [showDraftsPage, setShowDraftsPage] = useState(false);
  const [showDiscardSheet, setShowDiscardSheet] = useState(false);
  const [draftCount, setDraftCount] = useState(() => (uid ? draftService.count(uid) : 0));
  const [savedLabel, setSavedLabel] = useState('');

  const buildDraftPayload = () => ({
    id: draftIdRef.current,
    content,
    topic: selectedTopic,
    media: {
      image: attachedImage,
      video: attachedVideo,
      gif: attachedGif,
      audio: recordedAudio ? recordedAudio.dataUrl : null
    },
    audioDuration: recordedAudio ? recordedAudio.duration : null,
    music: attachedMusic,
    chainedThreads,
    poll: showPollCreator ? { options: pollOptions } : null,
    location: selectedLocation,
    replyPermission,
    reviewReplies,
    quotePost: activeQuotePost
      ? {
          id: activeQuotePost.id,
          author: activeQuotePost.author,
          content: activeQuotePost.content,
          imageUrl: activeQuotePost.imageUrl || null,
          hasVoice: activeQuotePost.hasVoice || false
        }
      : null
  });

  const persistDraftNow = async ({ announce = false } = {}) => {
    clearTimeout(autosaveTimerRef.current);
    if (!uid) return null;
    const payload = buildDraftPayload();
    if (!draftService.hasMeaningfulContent(payload)) {
      if (draftIdRef.current) await draftService.remove(uid, draftIdRef.current);
      return null;
    }
    if (!draftIdRef.current) draftIdRef.current = draftService.generateId();
    payload.id = draftIdRef.current;
    const saved = await draftService.save(uid, payload);
    if (saved && announce) {
      setSavedLabel(isAr ? 'حُفظت تلقائياً' : 'Auto-saved');
      clearTimeout(savedLabelTimerRef.current);
      savedLabelTimerRef.current = setTimeout(() => setSavedLabel(''), 1800);
    }
    return saved;
  };

  const resetComposer = () => {
    clearTimeout(autosaveTimerRef.current);
    draftIdRef.current = null;
    setContent('');
    setSelectedTopic('');
    setShowTopicPicker(false);
    setCustomTopicInput('');
    setRecordedAudio(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    setAttachedImage(null);
    setAttachedVideo(null);
    setVideoFile(null);
    setVideoPoster(null);
    setVideoDuration(null);
    setIsProcessingVideo(false);
    setAttachedGif(null);
    setAttachedMusic(null);
    setActiveQuotePost(null);
    setChainedThreads([]);
    setSelectedLocation(null);
    setShowLocationPicker(false);
    setShowPollCreator(false);
    setShowMoreMenu(false);
    setPollOptions(['', '']);
    setReplyPermission('anyone');
    setReviewReplies(false);
    setIsSensitive(false);
    setMentionQuery(null);
    setMicError('');
    setValidationError('');
    setIsPublishing(false);
  };

  const applyDraft = (draft) => {
    if (!draft) return;
    const m = draft.media || {};
    draftIdRef.current = draft.id;
    setContent(draft.content || '');
    setSelectedTopic(draft.topic || '');
    setAttachedImage(m.image || null);
    setAttachedVideo(m.video || null);
    setAttachedGif(m.gif || null);
    setAttachedMusic(draft.music || null);
    setActiveQuotePost(draft.quotePost || null);
    setChainedThreads(Array.isArray(draft.chainedThreads) ? draft.chainedThreads : []);
    setRecordedAudio(m.audio ? { dataUrl: m.audio, duration: draft.audioDuration || '0:00' } : null);
    if (draft.poll && Array.isArray(draft.poll.options)) {
      const opts = [...draft.poll.options];
      while (opts.length < 2) opts.push('');
      setPollOptions(opts.slice(0, 4));
      setShowPollCreator(true);
    } else {
      setShowPollCreator(false);
      setPollOptions(['', '']);
    }
    setSelectedLocation(draft.location || null);
    setReplyPermission(draft.replyPermission || 'anyone');
    setReviewReplies(Boolean(draft.reviewReplies));
    setIsSensitive(Boolean(draft.isSensitive));
    setMentionQuery(null);
    setValidationError('');
    setMicError('');
    setShowDraftsPage(false);
    hapticsService.light?.();
    setTimeout(() => textareaRef.current?.focus(), 120);
  };

  const handleOpenDrafts = async () => {
    hapticsService.selection?.();
    await persistDraftNow();
    setShowDraftsPage(true);
  };

  const requestClose = () => {
    const payload = buildDraftPayload();
    if (draftService.hasMeaningfulContent(payload) || isRecording) {
      hapticsService.selection?.();
      setShowDiscardSheet(true);
      return;
    }
    if (uid && draftIdRef.current) draftService.remove(uid, draftIdRef.current);
    resetComposer();
    onClose();
  };

  const handleSaveDraftAndClose = async () => {
    hapticsService.success?.();
    if (isRecording) {
      try { await stopRecording(); } catch { /* ignore */ }
    }
    await persistDraftNow();
    showToast(isAr ? 'تم حفظ المسودة' : 'Draft saved', 'success');
    setShowDiscardSheet(false);
    resetComposer();
    onClose();
  };

  const handleDiscardAndClose = async () => {
    hapticsService.warning?.();
    clearTimeout(autosaveTimerRef.current);
    if (isRecording) {
      try { await stopRecording(); } catch { /* ignore */ }
    }
    if (uid && draftIdRef.current) await draftService.remove(uid, draftIdRef.current);
    setShowDiscardSheet(false);
    resetComposer();
    onClose();
  };

  // Live draft counter
  useEffect(() => {
    if (!uid) return undefined;
    let alive = true;
    draftService.load(uid).then((list) => { if (alive) setDraftCount(list.length); });
    const unsub = draftService.subscribe((changedUid, list) => {
      if (changedUid === uid && alive) setDraftCount(list.length);
    });
    return () => { alive = false; unsub(); };
  }, [uid]);

  // Debounced auto-save
  useEffect(() => {
    if (!uid) return undefined;
    if (!isOpen) {
      if (draftIdRef.current) persistDraftNow();
      return undefined;
    }
    const payload = buildDraftPayload();
    if (!draftService.hasMeaningfulContent(payload) && !draftIdRef.current) return undefined;
    autosaveTimerRef.current = setTimeout(() => {
      persistDraftNow({ announce: true });
    }, 900);
    return () => clearTimeout(autosaveTimerRef.current);
  }, [
    isOpen, uid, content, attachedImage, attachedVideo, attachedGif, attachedMusic, activeQuotePost, recordedAudio,
    chainedThreads, showPollCreator, pollOptions, selectedLocation, replyPermission, reviewReplies, isSensitive
  ]);

  // Android hardware back
  const layersRef = useRef({});
  layersRef.current = {
    showTopicPicker, showDraftsPage, showDiscardSheet, showPostOptionsSheet, showLocationPicker, isGifModalOpen, isMusicModalOpen, isQuotePickerOpen
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  useEffect(() => {
    if (!isOpen) return undefined;
    const onBack = (e) => {
      e.preventDefault();
      const l = layersRef.current;
      if (l.showTopicPicker) return setShowTopicPicker(false);
      if (l.showDiscardSheet) return setShowDiscardSheet(false);
      if (l.showDraftsPage) return setShowDraftsPage(false);
      if (l.isQuotePickerOpen) return setIsQuotePickerOpen(false);
      if (l.isGifModalOpen) return setIsGifModalOpen(false);
      if (l.isMusicModalOpen) return setIsMusicModalOpen(false);
      if (l.showLocationPicker) return setShowLocationPicker(false);
      if (l.showPostOptionsSheet) return setShowPostOptionsSheet(false);
      return requestCloseRef.current();
    };
    window.addEventListener('pulse:compose-back', onBack);
    return () => window.removeEventListener('pulse:compose-back', onBack);
  }, [isOpen]);

  if (!isOpen) return null;

  // Unified Media Select (Smart Photos & Videos with Cloudinary Compression)
  const handleMediaSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type && file.type.startsWith('video/')) {
      if (file.size > 40 * 1024 * 1024) {
        showToast(
          isAr
            ? 'حجم الفيديو كبير، يرجى اختيار مقطع أقل من 40 ميجابايت.'
            : 'Video too large (limit 40MB).',
          'error'
        );
        return;
      }

      setIsProcessingVideo(true);
      try {
        const meta = await processVideoPreUpload(file);
        setVideoFile(file);
        const localPreviewUrl = URL.createObjectURL(file);
        setAttachedVideo(localPreviewUrl);
        setVideoPoster(meta.poster);
        setVideoDuration(meta.duration);
        setAttachedImage(null);
        setAttachedGif(null);
        try { hapticsService.light?.(); } catch {}
        showToast(
          isAr
            ? `تم تجهيز الفيديو (${meta.formattedDuration}) مع تفعيل ضغط كلاودنري الذكي`
            : `Video ready (${meta.formattedDuration}) with Cloudinary compression`,
          'success'
        );
      } catch (err) {
        console.warn('Video pre-processing warning:', err);
        setVideoFile(file);
        setAttachedVideo(URL.createObjectURL(file));
        setAttachedImage(null);
        setAttachedGif(null);
      } finally {
        setIsProcessingVideo(false);
        if (e.target) e.target.value = '';
      }
    } else {
      // Photo processing
      try {
        const compressedBase64 = await compressImageToBase64(file, 1200, 1200, 0.82);
        setAttachedImage(compressedBase64);
        setAttachedVideo(null);
        setVideoFile(null);
        setVideoPoster(null);
        setVideoDuration(null);
        setAttachedGif(null);
        try { hapticsService.light?.(); } catch {}
      } catch (err) {
        console.error(err);
        showToast(isAr ? 'حدث خطأ أثناء معالجة الصورة' : 'Error compressing image', 'error');
      } finally {
        if (e.target) e.target.value = '';
      }
    }
  };

  const handleImageSelect = handleMediaSelect;
  const handleVideoSelect = handleMediaSelect;

  const handleStartRecording = async () => {
    setMicError('');
    try {
      await startRecording();
      setIsRecording(true);
      setRecordingSeconds(0);
      hapticsService.medium?.();
    } catch (err) {
      console.error(err);
      setMicError(isAr 
        ? 'تعذر الوصول للميكروفون. يرجى تفعيل الإذن.' 
        : 'Microphone access denied.');
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await stopRecording();
      setIsRecording(false);
      const mins = Math.floor(recordingSeconds / 60);
      const secs = recordingSeconds % 60;
      setRecordedAudio({
        dataUrl: result.dataUrl,
        duration: `${mins}:${secs < 10 ? '0' : ''}${secs}`
      });
      hapticsService.light?.();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  // GPS Location
  const handleUseGps = async () => {
    setIsDetectingGps(true);
    try {
      const coords = await locationService.getCurrentPosition();
      const geocoded = await locationService.reverseGeocode(coords.lat, coords.lng, lang);
      setSelectedLocation({
        name: geocoded.name,
        city: geocoded.city,
        country: geocoded.country,
        lat: coords.lat,
        lng: coords.lng
      });
      setShowLocationPicker(false);
      showToast(isAr ? `تم تحديد موقعك: ${geocoded.name}` : `Location: ${geocoded.name}`, 'success');
      hapticsService.light?.();
    } catch (err) {
      console.warn('GPS error:', err);
      showToast(isAr ? 'تعذر تحديد الموقع تلقائياً.' : 'GPS detection failed.', 'error');
    } finally {
      setIsDetectingGps(false);
    }
  };

  const handleSelectLocation = (loc) => {
    setSelectedLocation({
      name: isAr ? loc.name : loc.nameEn,
      city: isAr ? loc.city : loc.cityEn,
      country: loc.country,
      lat: loc.lat,
      lng: loc.lng
    });
    setShowLocationPicker(false);
    setLocSearchQuery('');
    hapticsService.selection?.();
  };

  const handlePollOptionChange = (idx, text) => {
    const next = [...pollOptions];
    next[idx] = text;
    setPollOptions(next);
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
      hapticsService.light?.();
    }
  };

  const handleRemovePollOption = (idx) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  // Final Publish Handler with real Cloudinary hosting for all media
  const handlePublish = async () => {
    setValidationError('');

    const hasText = content.trim().length > 0;
    const hasAudio = !!recordedAudio;
    const hasImage = !!attachedImage;
    const hasVideo = !!attachedVideo;
    const hasGif = !!attachedGif;
    const hasMusic = !!attachedMusic;
    const validPollOptions = pollOptions.filter(o => o.trim().length > 0);
    const hasPoll = showPollCreator && validPollOptions.length >= 2;

    if (!hasText && !hasAudio && !hasImage && !hasVideo && !hasGif && !hasMusic && !hasPoll && !activeQuotePost) {
      return;
    }

    const rateCheck = moderationService.checkRateLimit(10);
    if (!rateCheck.allowed) {
      setValidationError(rateCheck.message);
      return;
    }

    const dupCheck = moderationService.checkDuplicateContent(content, 60);
    if (!dupCheck.allowed) {
      setValidationError(dupCheck.message);
      return;
    }

    const profanityCheck = moderationService.checkProfanity(content);
    if (!profanityCheck.clean) {
      setValidationError(profanityCheck.message);
      return;
    }

    if (content.length > maxChars) {
      setValidationError(
        isAr 
          ? `تجاوزت الحد الأقصى للمحتوى (${maxChars} حرف).` 
          : `Exceeded character limit (${maxChars} characters).`
      );
      return;
    }

    setIsPublishing(true);

    try {
      // 1. Cloudinary Image Upload
      let finalImageUrl = attachedGif || attachedImage || null;
      if (attachedImage && attachedImage.startsWith('data:image')) {
        try {
          finalImageUrl = await cloudinaryService.uploadImage(attachedImage, 'pulse_posts');
        } catch (cloudErr) {
          console.warn('Cloudinary post image upload error:', cloudErr);
        }
      }

      // 2. Cloudinary Video Upload with Intelligent Perceptual Compression
      let finalVideoUrl = null;
      let finalVideoPoster = videoPoster || null;

      if (videoFile || (attachedVideo && (attachedVideo.startsWith('data:video') || attachedVideo.startsWith('blob:') || attachedVideo.startsWith('http')))) {
        try {
          finalVideoUrl = await cloudinaryService.uploadVideo(videoFile || attachedVideo, 'pulse_videos');
          if (finalVideoUrl) {
            finalVideoPoster = cloudinaryService.getVideoThumbnail(finalVideoUrl) || videoPoster;
          }
        } catch (cloudErr) {
          console.warn('Cloudinary post video upload error:', cloudErr);
          if (!finalVideoUrl && attachedVideo && !attachedVideo.startsWith('blob:')) {
            finalVideoUrl = attachedVideo;
          }
        }
      }

      // 3. Cloudinary Voice Note Upload
      let finalAudioUrl = recordedAudio ? recordedAudio.dataUrl : null;
      if (recordedAudio && recordedAudio.dataUrl && recordedAudio.dataUrl.startsWith('data:audio')) {
        try {
          finalAudioUrl = await cloudinaryService.uploadAudio(recordedAudio.dataUrl, 'pulse_voice');
        } catch (cloudErr) {
          console.warn('Cloudinary post audio upload error:', cloudErr);
        }
      }

      const mainPostId = 'post-' + Date.now();
      const newPost = {
        id: mainPostId,
        authorId: currentUser.uid,
        author: {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          username: currentUser.username,
          avatar: currentUser.avatar,
          isVerified: currentUser.isVerified || false,
          isFounder: currentUser.isFounder || false,
          badgeTitle: currentUser.badgeTitle || null,
          isPrivate: currentUser.isPrivate || false
        },
        content: sanitizeInput(content, maxChars).trim(),
        audioUrl: finalAudioUrl,
        audioDuration: recordedAudio ? recordedAudio.duration : null,
        hasVoice: !!finalAudioUrl,
        voiceListens: 0,
        music: attachedMusic ? {
          id: attachedMusic.id,
          title: attachedMusic.title,
          artist: attachedMusic.artist,
          duration: attachedMusic.duration,
          coverUrl: attachedMusic.coverUrl,
          audioUrl: attachedMusic.audioUrl,
          isCustom: Boolean(attachedMusic.isCustom)
        } : null,
        likes: [],
        likesCount: 0,
        reposts: [],
        repostsCount: 0,
        repliesCount: 0,
        bookmarksCount: 0,
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        videoPoster: finalVideoPoster,
        videoDuration: videoDuration,
        isSensitive: Boolean(isSensitive),
        sensitiveType: isSensitive ? 'adult' : null,
        isGif: !!attachedGif,
        isCrossPost: Boolean(isCrossPost),
        location: selectedLocation ? selectedLocation.name : null,
        city: selectedLocation ? selectedLocation.city : null,
        coords: selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null,
        poll: hasPoll ? {
          options: validPollOptions.map(opt => ({ text: opt.trim(), votes: [] })),
          totalVotes: 0
        } : null,
        quotePost: activeQuotePost ? {
          id: activeQuotePost.id,
          author: activeQuotePost.author,
          content: activeQuotePost.content,
          imageUrl: activeQuotePost.imageUrl || null,
          hasVoice: activeQuotePost.hasVoice || false
        } : null,
        topic: selectedTopic ? selectedTopic.trim() : null,
        replyPermission,
        reviewReplies,
        createdAt: new Date().toISOString()
      };

      moderationService.recordPostTimestamp();
      moderationService.recordPostContent(content);
      onPublish(newPost);

      // Publish chained thread items sequentially
      if (chainedThreads.length > 0) {
        chainedThreads.forEach((item, idx) => {
          if (item.content && item.content.trim()) {
            const chainedPost = {
              id: 'post-' + (Date.now() + idx + 1),
              authorId: currentUser.uid,
              author: newPost.author,
              content: sanitizeInput(item.content, maxChars).trim(),
              replyToId: mainPostId,
              likes: [],
              likesCount: 0,
              reposts: [],
              repostsCount: 0,
              repliesCount: 0,
              bookmarksCount: 0,
              createdAt: new Date(Date.now() + (idx + 1) * 100).toISOString()
            };
            setTimeout(() => onPublish(chainedPost), (idx + 1) * 200);
          }
        });
      }

      clearTimeout(autosaveTimerRef.current);
      if (uid && draftIdRef.current) {
        draftService.remove(uid, draftIdRef.current);
      }

      resetComposer();
      onClose();
    } catch (publishErr) {
      console.error('Publish error:', publishErr);
      setValidationError(publishErr.message || (isAr ? 'حدث خطأ أثناء النشر' : 'Publish failed'));
    } finally {
      setIsPublishing(false);
    }
  };

  const isPostEmpty = !content.trim() && !recordedAudio && !attachedImage && !attachedVideo && !attachedGif && !attachedMusic && !(showPollCreator && pollOptions.filter(o => o.trim()).length >= 2) && !activeQuotePost;

  const filteredLocations = POPULAR_LOCATIONS.filter(loc => {
    if (!locSearchQuery.trim()) return true;
    const q = locSearchQuery.toLowerCase();
    return loc.name.toLowerCase().includes(q) || loc.nameEn.toLowerCase().includes(q) || loc.city.toLowerCase().includes(q);
  });

  const modalContent = (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-[440px] h-full sm:h-[92vh] bg-[#000000] border-0 sm:border border-[#222226] sm:rounded-3xl text-white flex flex-col justify-between animate-sheet-up overflow-hidden shadow-2xl relative">
        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*,video/mp4,video/webm,video/quicktime,video/mov,video/*"
          className="hidden"
          onChange={handleMediaSelect}
        />
        <input
          type="file"
          ref={videoInputRef}
          accept="video/mp4,video/webm,video/quicktime,video/mov,video/*"
          className="hidden"
          onChange={handleMediaSelect}
        />

        {/* 1. TOP HEADER (Screenshot 1 Exact 1:1 Match) */}
        <div className="pt-[max(0.75rem,env(safe-area-inset-top))] px-4 pb-3 flex items-center justify-between border-b border-[#18181A]">
          <div className="flex items-center gap-3">
            <button
              onClick={requestClose}
              className="p-1 rounded-full text-white hover:bg-white/10 tap-press transition-colors"
              aria-label={isAr ? 'إغلاق' : 'Close'}
            >
              <X size={22} />
            </button>
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              {isAr ? 'نبضة جديدة' : 'New pulse'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenDrafts}
              className="relative p-1.5 rounded-full text-neutral-300 hover:text-white tap-press transition-colors"
              title={isAr ? 'المسودات' : 'Drafts'}
              aria-label={isAr ? 'المسودات' : 'Drafts'}
            >
              <FileText size={21} />
              {draftCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-white text-black text-[10px] leading-4 font-extrabold text-center">
                  {draftCount > 99 ? '99+' : draftCount}
                </span>
              )}
            </button>
            <button 
              type="button" 
              onClick={() => {
                hapticsService.light?.();
                setShowPostOptionsSheet(true);
              }}
              className="w-7 h-7 rounded-full border border-neutral-600 flex items-center justify-center text-neutral-300 hover:text-white hover:border-white tap-press transition-colors"
            >
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* 2. MAIN COMPOSER BODY (Scrollable Threads Thread Line Layout) */}
        <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar relative">
          <div className="flex gap-3 max-w-xl mx-auto">
            {/* Thread Avatar & Signature Vertical Connector Line */}
            <div className="flex flex-col items-center">
              <img
                src={currentUser?.avatar || DEFAULT_AVATAR}
                alt={currentUser?.displayName}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
              />
              <div className="w-[1.5px] bg-[#2A2A2D] flex-1 my-2" />
              <img
                src={currentUser?.avatar || DEFAULT_AVATAR}
                alt=""
                className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 opacity-40 flex-shrink-0"
              />
            </div>

            {/* Right Content Area */}
            <div className="flex-1 min-w-0 pb-4">
              {/* Header: Username & Topic Selector (PULSE Official) */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                <span className="font-semibold text-white font-mono" dir="ltr">
                  {currentUser?.username || 'user'}
                </span>
                <span className="text-neutral-500">›</span>
                <button
                  type="button"
                  onClick={() => {
                    try { hapticsService.light?.(); } catch {}
                    setShowTopicPicker(true);
                  }}
                  className="text-[12px] truncate flex items-center gap-1 transition-colors tap-press group"
                >
                  <span className={selectedTopic ? 'text-white font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/15' : 'text-neutral-400 group-hover:text-neutral-200'}>
                    {selectedTopic || (isAr ? 'الموضوع' : 'Topic')}
                  </span>
                  {selectedTopic && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        try { hapticsService.light?.(); } catch {}
                        setSelectedTopic('');
                      }}
                      className="p-0.5 rounded-full hover:bg-white/20 text-neutral-400 hover:text-white"
                      title={isAr ? 'إلغاء الموضوع' : 'Clear topic'}
                    >
                      <X size={12} />
                    </span>
                  )}
                </button>
              </div>

                            {/* Active Sensitive Post Badge */}
              {isSensitive && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2 animate-fade-in">
                  <ShieldAlert size={13} className="text-amber-400 flex-shrink-0" />
                  <span>{isAr ? 'محتوى مخصص للبالغين (+18)' : 'Adult content (+18)'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      try { hapticsService.light?.(); } catch {}
                      setIsSensitive(false);
                    }}
                    className="ms-1.5 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"
                    title={isAr ? 'إلغاء' : 'Remove'}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Auto-growing Textarea */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                placeholder={isAr ? 'ما الجديد؟' : "What's new?"}
                rows={3}
                className="w-full bg-transparent text-white placeholder-neutral-500 text-[15px] focus:outline-none leading-relaxed resize-none mt-1"
                autoFocus
              />

              {/* Mention autocomplete dropdown */}
              {mentionQuery !== null && (
                <div className="relative w-full z-40">
                  <MentionAutocomplete
                    query={mentionQuery}
                    onSelect={handleSelectMention}
                    isOpen={true}
                    placement="inline"
                  />
                </div>
              )}

              {/* Quoted Post Embed Preview with Delete button */}
              {activeQuotePost && (
                <div className="relative mt-3 p-3 rounded-2xl bg-[#141416] border border-white/10 text-xs text-neutral-300 animate-fade-in group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <img 
                        src={activeQuotePost.author?.avatar || DEFAULT_AVATAR} 
                        alt="" 
                        className="w-4 h-4 rounded-full object-cover ring-1 ring-white/10" 
                      />
                      <span className="font-semibold text-white font-mono truncate" dir="ltr">
                        @{activeQuotePost.author?.username}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        hapticsService.light?.();
                        setActiveQuotePost(null);
                      }}
                      className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 tap-press transition-colors"
                      title={isAr ? 'إلغاء الاقتباس' : 'Remove quote'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="line-clamp-2 text-neutral-200 leading-relaxed">{activeQuotePost.content}</p>
                  {activeQuotePost.imageUrl && (
                    <div className="mt-2 w-full h-24 rounded-xl overflow-hidden bg-black/40 border border-white/5">
                      <img src={activeQuotePost.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* Attached Media: Image */}
              {attachedImage && (
                <div className="relative mt-3 rounded-2xl overflow-hidden border border-white/10 max-h-64 group bg-[#111113]">
                  <img src={attachedImage} alt="Attached" className="w-full h-full object-cover max-h-64" />
                  <button
                    type="button"
                    onClick={() => setIsImageEditorOpen(true)}
                    className="absolute bottom-2.5 start-2.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 backdrop-blur-md tap-press transition-all shadow-lg"
                  >
                    <Crop size={13} />
                    <span>{isAr ? 'تعديل الصورة' : 'Edit photo'}</span>
                  </button>
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="absolute top-2.5 end-2.5 p-1.5 rounded-full bg-black/80 text-white hover:bg-neutral-800 tap-press transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Attached Media: GIF */}
              {attachedGif && (
                <div className="relative mt-3 rounded-2xl overflow-hidden border border-white/10 max-h-64 group bg-[#111113]">
                  <img src={attachedGif} alt="GIF" className="w-full h-full object-contain max-h-64" />
                  <span className="absolute bottom-2 start-2 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">GIF</span>
                  <button
                    onClick={() => setAttachedGif(null)}
                    className="absolute top-2.5 end-2.5 p-1.5 rounded-full bg-black/80 text-white hover:bg-neutral-800 tap-press transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Attached Media: Video with Smart Cloudinary Compression Preview */}
              {isProcessingVideo && (
                <div className="mt-3 p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-center gap-3 text-xs text-neutral-300">
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>{isAr ? 'جاري فحص وتجهيز الفيديو مع تفعيل الضغط الذكي...' : 'Analyzing and optimizing video...'}</span>
                </div>
              )}

              {attachedVideo && !isProcessingVideo && (
                <div className="relative mt-3 rounded-2xl overflow-hidden border border-[#26262E] max-h-64 group bg-black flex items-center justify-center">
                  <video 
                    src={attachedVideo} 
                    poster={videoPoster} 
                    playsInline 
                    muted 
                    loop 
                    autoPlay 
                    className="w-full h-full object-contain max-h-64 rounded-2xl" 
                  />

                  {/* Smart compression indicator on top-start */}
                  <div className="absolute top-2.5 start-2.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono text-neutral-200 flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span>{isAr ? 'ضغط كلاودنري الذكي 1080p' : 'Cloudinary HD Compression'}</span>
                  </div>

                  {/* Video duration pill on bottom-start */}
                  {videoDuration && (
                    <div className="absolute bottom-2.5 start-2.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white">
                      {formatVideoDuration(videoDuration)}
                    </div>
                  )}

                  {/* Remove video button on top-end */}
                  <button
                    type="button"
                    onClick={() => {
                      try { hapticsService.light?.(); } catch {}
                      setAttachedVideo(null);
                      setVideoFile(null);
                      setVideoPoster(null);
                      setVideoDuration(null);
                    }}
                    className="absolute top-2.5 end-2.5 p-1.5 rounded-full bg-black/80 hover:bg-neutral-800 text-white tap-press transition-colors z-10"
                    aria-label={isAr ? 'إزالة الفيديو' : 'Remove video'}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Attached Media: PULSE Music Card matching Threads screenshot */}
              {attachedMusic && (
                <div className="mt-3">
                  <div className="relative p-3 rounded-2xl bg-[#141417] border border-[#26262B] flex items-center justify-between gap-3 group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 flex-shrink-0 relative">
                        <img 
                          src={attachedMusic.coverUrl || DEFAULT_AVATAR} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_AVATAR; }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate leading-tight">{attachedMusic.title}</div>
                        <div className="text-xs text-neutral-400 truncate mt-0.5">{attachedMusic.artist}</div>
                      </div>
                    </div>

                    {/* Circular Play / Pause Button matching Threads screenshot */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          hapticsService.light?.();
                          soundService.playPreview(attachedMusic);
                        }}
                        className="w-10 h-10 rounded-full bg-[#24242A] hover:bg-[#2C2C34] active:scale-95 text-white flex items-center justify-center transition-all shadow-sm"
                        aria-label={playingMusicId === attachedMusic.id ? 'Pause' : 'Play'}
                      >
                        {playingMusicId === attachedMusic.id ? (
                          <Pause size={18} className="fill-current text-white" />
                        ) : (
                          <Play size={18} className="fill-current text-white ml-0.5" />
                        )}
                      </button>

                      {/* Threads 'X' Button on the card */}
                      <button
                        type="button"
                        onClick={() => {
                          soundService.stopPreview();
                          setAttachedMusic(null);
                        }}
                        className="w-7 h-7 rounded-full bg-[#24242A] hover:bg-[#2C2C34] text-neutral-400 hover:text-white flex items-center justify-center tap-press transition-colors"
                        aria-label="Remove music"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 'Adjust clip' text link underneath matching Threads screenshot */}
                  <div className="mt-1.5 px-1">
                    <button
                      type="button"
                      onClick={() => setIsMusicModalOpen(true)}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                      {isAr ? 'تعديل المقطع' : 'Adjust clip'}
                    </button>
                  </div>
                </div>
              )}

              {/* Location Tag Badge */}
              {selectedLocation && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300">
                  <MapPin size={13} className="text-[#0095F6]" />
                  <span className="truncate max-w-[200px]">{selectedLocation.name}</span>
                  <button onClick={() => setSelectedLocation(null)} className="p-0.5 hover:text-white">
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* Interactive Poll Builder */}
              {showPollCreator && (
                <div className="mt-3 p-3.5 rounded-2xl bg-[#141416] border border-white/10 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <BarChart2 size={14} className="text-[#0095F6]" />
                      {isAr ? 'استطلاع رأي' : 'Poll'}
                    </span>
                    <button
                      onClick={() => {
                        setShowPollCreator(false);
                        setPollOptions(['', '']);
                      }}
                      className="p-1 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                        placeholder={`${isAr ? 'الخيار' : 'Option'} ${idx + 1}`}
                        maxLength={60}
                        className="flex-1 bg-[#1E1E22] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          onClick={() => handleRemovePollOption(idx)}
                          className="p-1 text-neutral-500 hover:text-rose-400 tap-press"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="flex items-center gap-1.5 text-xs text-[#0095F6] hover:text-[#0095F6]/80 font-medium pt-1 tap-press"
                    >
                      <Plus size={14} />
                      <span>{isAr ? 'إضافة خيار آخر' : 'Add another option'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Recording Audio Preview */}
              {isRecording && (
                <div className="mt-3 p-3 bg-red-950/30 border border-red-800/40 rounded-2xl flex items-center justify-between animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs text-neutral-200">{isAr ? 'جاري التسجيل...' : 'Recording...'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-white">
                      {Math.floor(recordingSeconds / 60)}:{recordingSeconds % 60 < 10 ? `0${recordingSeconds % 60}` : recordingSeconds % 60} / {isProUser ? '2:00' : '0:30'}
                    </span>
                    <button
                      onClick={handleStopRecording}
                      className="p-1.5 bg-red-600 rounded-full text-white hover:bg-red-500 tap-press"
                    >
                      <Square size={13} className="fill-white" />
                    </button>
                  </div>
                </div>
              )}

              {recordedAudio && (
                <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <Mic size={15} className="text-white" />
                    <span className="text-xs text-neutral-200">{isAr ? 'ملاحظة صوتية' : 'Voice note'}</span>
                    <span className="text-xs font-mono text-neutral-400">({recordedAudio.duration})</span>
                  </div>
                  <button
                    onClick={() => setRecordedAudio(null)}
                    className="p-1.5 text-neutral-400 hover:text-rose-400 tap-press transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}

              {/* Validation & Error banners */}
              {validationError && (
                <div className="mt-3 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2 text-xs text-rose-300 animate-fade-in-up">
                  <AlertCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {micError && (
                <div className="text-xs text-rose-400 mt-2">{micError}</div>
              )}

              {/* 3. EXACT 5-ICON TOOLBAR MATCHING SCREENSHOT 1 */}
              <div className="relative flex items-center gap-4 mt-3 text-neutral-400">
                {/* 1. Image / Gallery */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="hover:text-white tap-press transition-colors"
                  title={isAr ? 'إرفاق صورة' : 'Photo'}
                >
                  <ImageIcon size={21} />
                </button>

                {/* 2. GIF Badge */}
                <button
                  type="button"
                  onClick={() => setIsGifModalOpen(true)}
                  className="w-6 h-5 rounded border border-neutral-400 flex items-center justify-center text-[10px] font-extrabold text-neutral-300 hover:text-white hover:border-white tap-press transition-colors"
                  title="GIF"
                >
                  GIF
                </button>

                {/* 3. Mic / Voice */}
                <button
                  type="button"
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={`hover:text-white tap-press transition-colors ${
                    isRecording ? 'text-red-500' : ''
                  }`}
                  title={isAr ? 'تسجيل صوت' : 'Voice'}
                >
                  <Mic size={21} />
                </button>

                {/* 4. Music Note */}
                <button
                  type="button"
                  onClick={() => {
                    hapticsService.light?.();
                    setIsMusicModalOpen(true);
                  }}
                  className={`hover:text-white tap-press transition-colors ${
                    attachedMusic ? 'text-[#0095F6]' : ''
                  }`}
                  title={isAr ? 'إضافة موسيقى' : 'Music'}
                >
                  <Music2 size={21} />
                </button>

                {/* 5. More Circle Icon */}
                <div className="relative" ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      hapticsService.light?.();
                      setShowMoreMenu((prev) => !prev);
                    }}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors tap-press ${
                      showMoreMenu ? 'border-white text-white bg-white/10' : 'border-neutral-500 text-neutral-400 hover:text-white hover:border-white'
                    }`}
                    title={isAr ? 'المزيد' : 'More'}
                  >
                    <MoreHorizontal size={14} />
                  </button>

                  {/* FLOATING MORE POPOVER MENU (Fully on-screen with end-0) */}
                  {showMoreMenu && (
                    <div 
                      className="absolute top-full mt-2 z-50 end-0 w-48 sm:w-52 max-w-[calc(100vw-48px)] bg-[#1C1C1E] border border-white/15 rounded-2xl py-1 shadow-2xl divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {/* Row 0: Video Direct Select */}
                      <div
                        onClick={() => {
                          setShowMoreMenu(false);
                          try { hapticsService.light?.(); } catch {}
                          videoInputRef.current?.click();
                        }}
                        className="px-4 py-3 flex items-center justify-between text-[14px] font-medium text-white hover:bg-white/5 active:bg-white/10 cursor-pointer tap-press transition-colors"
                      >
                        <span>{isAr ? 'فيديو' : 'Video'}</span>
                        <Video size={18} className="text-neutral-300" />
                      </div>

                      {/* Row 1: Text (Focuses & smooth-scrolls to textarea) */}
                      <div
                        onClick={() => {
                          setShowMoreMenu(false);
                          hapticsService.light?.();
                          textareaRef.current?.focus();
                          textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="px-4 py-3 flex items-center justify-between text-[14px] font-medium text-white hover:bg-white/5 active:bg-white/10 cursor-pointer tap-press transition-colors"
                      >
                        <span>{isAr ? 'نص' : 'Text'}</span>
                        <FileText size={18} className="text-neutral-300" />
                      </div>

                      {/* Row 2: Quote (Opens Real Quote Picker) */}
                      <div
                        onClick={() => {
                          setShowMoreMenu(false);
                          hapticsService.light?.();
                          setIsQuotePickerOpen(true);
                        }}
                        className="px-4 py-3 flex items-center justify-between text-[14px] font-medium text-white hover:bg-white/5 active:bg-white/10 cursor-pointer tap-press transition-colors"
                      >
                        <span>{isAr ? 'اقتباس' : 'Quote'}</span>
                        <Quote size={18} className="text-neutral-300" />
                      </div>

                      {/* Row 3: Poll (Opens Real Interactive Poll Builder) */}
                      <div
                        onClick={() => {
                          setShowMoreMenu(false);
                          hapticsService.light?.();
                          setShowPollCreator(true);
                          if (!pollOptions || pollOptions.length < 2) {
                            setPollOptions(['', '']);
                          }
                        }}
                        className="px-4 py-3 flex items-center justify-between text-[14px] font-medium text-white hover:bg-white/5 active:bg-white/10 cursor-pointer tap-press transition-colors"
                      >
                        <span>{isAr ? 'استطلاع رأي' : 'Poll'}</span>
                        <AlignLeft size={18} className="text-neutral-300" />
                      </div>

                      {/* Row 4: Location (Opens Real Location & GPS Picker) */}
                      <div
                        onClick={() => {
                          setShowMoreMenu(false);
                          hapticsService.light?.();
                          setShowLocationPicker(true);
                        }}
                        className="px-4 py-3 flex items-center justify-between text-[14px] font-medium text-white hover:bg-white/5 active:bg-white/10 cursor-pointer tap-press transition-colors"
                      >
                        <span>{isAr ? 'الموقع' : 'Location'}</span>
                        <MapPin size={18} className="text-neutral-300" />
                      </div>
                      {/* Row 5: Sensitive Content (+18) Toggle */}
                      <div
                        onClick={() => {
                          setShowMoreMenu(false);
                          try { hapticsService.light?.(); } catch {}
                          setIsSensitive(!isSensitive);
                        }}
                        className="px-4 py-3 flex items-center justify-between text-[14px] font-medium text-white hover:bg-white/5 active:bg-white/10 cursor-pointer tap-press transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span>{isAr ? 'محتوى حساس (+18)' : 'Sensitive (+18)'}</span>
                          {isSensitive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                              {isAr ? 'مفعّل' : 'Active'}
                            </span>
                          )}
                        </div>
                        <ShieldAlert size={18} className={isSensitive ? 'text-amber-400' : 'text-neutral-300'} />
                      </div>

                    </div>
                  )}
                </div>
              </div>

              {/* Chained Thread Items */}
              {chainedThreads.map((chain, cIdx) => (
                <div key={chain.id} className="mt-4 pt-3 border-t border-[#1C1C20] flex gap-3 animate-fade-in">
                  <div className="flex flex-col items-center">
                    <img
                      src={currentUser?.avatar || DEFAULT_AVATAR}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
                    />
                    <div className="w-[1.5px] bg-[#2A2A2D] flex-1 my-1.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                      <span className="font-mono text-neutral-400">#{cIdx + 2}</span>
                      <button
                        onClick={() => handleRemoveChainedThread(chain.id)}
                        className="text-neutral-500 hover:text-rose-400 p-0.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <textarea
                      value={chain.content}
                      onChange={(e) => handleUpdateChainedThread(chain.id, e.target.value)}
                      placeholder={isAr ? 'أضف تفاصيل أخرى للنبضة...' : 'Say more in pulse...'}
                      rows={2}
                      className="w-full bg-transparent text-white placeholder-neutral-500 text-[14px] focus:outline-none leading-relaxed resize-none"
                    />
                  </div>
                </div>
              ))}

              {/* 4. "Add to thread" Secondary Row (Screenshot 1 Match) */}
              <div className="flex items-center gap-2 mt-4 text-xs text-neutral-500">
                <button
                  type="button"
                  onClick={handleAddThread}
                  className="hover:text-neutral-300 tap-press cursor-pointer transition-colors"
                >
                  {isAr ? 'إضافة إلى النبضة' : 'Add to pulse'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. STICKY BOTTOM BAR (Screenshot 1 Exact Match) */}
        <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))] px-4 pt-3 flex items-center justify-between border-t border-[#18181A] bg-[#000000]">
          {/* Left: Sliders / Post Options Button */}
          <button
            type="button"
            onClick={() => {
              hapticsService.selection?.();
              setShowPostOptionsSheet(true);
            }}
            className="flex items-center gap-2 text-[13px] text-neutral-400 hover:text-white tap-press transition-colors py-1.5 px-2 rounded-lg"
          >
            <SlidersHorizontal size={16} />
            <span>{isAr ? 'خيارات النبضة' : 'Post options'}</span>
          </button>

          {/* Right: Post Pill Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePublish}
              disabled={isPostEmpty || content.length > maxChars || isPublishing}
              className={`px-5 py-2 rounded-full font-bold text-xs transition-all tap-press flex items-center gap-1.5 ${
                isPostEmpty || content.length > maxChars || isPublishing
                  ? 'bg-[#1E1E22] text-neutral-500 opacity-40 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-neutral-200 shadow-md'
              }`}
            >
              {isPublishing && <Loader2 size={13} className="animate-spin text-black" />}
              <span>{isAr ? 'نشر' : 'Post'}</span>
            </button>
          </div>
        </div>

        {/* 6. THREADS "POST OPTIONS" BOTTOM SHEET */}
        {showPostOptionsSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-md animate-in fade-in">
            <div className="absolute inset-0" onClick={() => setShowPostOptionsSheet(false)} />

            <div className="relative bg-[#1C1C1E] border-t border-white/10 w-full max-w-lg rounded-t-3xl p-5 shadow-2xl animate-sheet-up">
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

              <h3 className="text-base font-bold text-white mb-4 text-center">
                {isAr ? 'خيارات النبضة' : 'Post options'}
              </h3>

              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-1">
                {isAr ? 'من يمكنه الرد والاقتباس' : 'Who can reply and quote'}
              </div>

              <div className="rounded-2xl bg-[#2C2C2E]/60 border border-white/5 divide-y divide-white/5 overflow-hidden mb-4">
                {[
                  { id: 'anyone', labelAr: 'أي شخص', labelEn: 'Anyone' },
                  { id: 'followers', labelAr: 'متابعوك', labelEn: 'Your followers' },
                  { id: 'following', labelAr: 'الملفات الشخصية التي تتابعها', labelEn: 'Profiles you follow' },
                  { id: 'mentions', labelAr: 'الملفات الشخصية التي تذكرها فقط', labelEn: 'Profiles you mention' }
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => {
                      hapticsService.selection?.();
                      setReplyPermission(opt.id);
                    }}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 tap-press transition-colors"
                  >
                    <span className="text-xs font-medium text-white">
                      {isAr ? opt.labelAr : opt.labelEn}
                    </span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      replyPermission === opt.id ? 'border-white bg-white' : 'border-neutral-500 bg-transparent'
                    }`}>
                      {replyPermission === opt.id && (
                        <div className="w-2 h-2 rounded-full bg-black" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-[#2C2C2E]/60 border border-white/5 p-3.5 flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-white">
                  {isAr ? 'مراجعة الردود والموافقة عليها' : 'Review and approve replies'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    hapticsService.light?.();
                    setReviewReplies(!reviewReplies);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                    reviewReplies ? 'bg-white' : 'bg-neutral-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full transition-transform ${
                    reviewReplies ? 'translate-x-5 bg-black' : 'translate-x-0.5 bg-white'
                  }`} />
                </button>
              </div>

                            {/* Sensitive Adult Content Toggle (+18) */}
              <div className="rounded-2xl bg-[#2C2C2E]/60 border border-white/5 p-3.5 flex items-center justify-between mb-4">
                <div className="pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white">
                      {isAr ? 'محتوى مخصص للبالغين (+18)' : 'Adult content (+18)'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      +18
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    {isAr ? 'تطبيق غطاء ضبابي وتحذير سن المشاهد' : 'Apply warning overlay and blur'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try { hapticsService.light?.(); } catch {}
                    setIsSensitive(!isSensitive);
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center flex-shrink-0 ${
                    isSensitive ? 'bg-amber-500' : 'bg-neutral-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full transition-transform ${
                    isSensitive ? (isAr ? '-translate-x-5 bg-black' : 'translate-x-5 bg-black') : (isAr ? '-translate-x-0.5 bg-white' : 'translate-x-0.5 bg-white')
                  }`} />
                </button>
              </div>

              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-1">
                {isAr ? 'الجمهور' : 'Audience'}
              </div>
              <div className="rounded-2xl bg-[#2C2C2E]/60 border border-white/5 p-3.5 flex items-center justify-between mb-6">
                <span className="text-xs font-medium text-white">
                  {isAr ? 'المشاركة أيضاً على' : 'Also share on'}
                </span>
                <span className="text-xs text-neutral-400">Off ›</span>
              </div>

              <button
                onClick={() => {
                  hapticsService.light?.();
                  setShowPostOptionsSheet(false);
                }}
                className="w-full py-3 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 tap-press transition-colors shadow-lg"
              >
                {isAr ? 'تم' : 'Done'}
              </button>
            </div>
          </div>
        )}

        {/* 7. REAL LOCATION PICKER MODAL */}
        {showLocationPicker && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
            <div className="absolute inset-0" onClick={() => setShowLocationPicker(false)} />
            <div className="relative bg-[#141416] border border-white/10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-sheet-up max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-[#0095F6]" />
                  <span className="font-bold text-sm text-white">{isAr ? 'إضافة الموقع الجغرافي' : 'Add location'}</span>
                </div>
                <button onClick={() => setShowLocationPicker(false)} className="p-1 text-neutral-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <button
                onClick={handleUseGps}
                disabled={isDetectingGps}
                className="w-full mt-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-xs font-semibold text-white tap-press transition-colors"
              >
                {isDetectingGps ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-[#0095F6]" />
                    <span>{isAr ? 'جاري تحديد موقعك عبر GPS...' : 'Detecting GPS location...'}</span>
                  </>
                ) : (
                  <>
                    <Navigation size={15} className="text-[#0095F6]" />
                    <span>{isAr ? 'استخدام موقعي الحالي (GPS)' : 'Use current GPS location'}</span>
                  </>
                )}
              </button>

              <div className="mt-3 relative">
                <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={locSearchQuery}
                  onChange={(e) => setLocSearchQuery(e.target.value)}
                  placeholder={isAr ? 'ابحث عن مدينة أو منطقة...' : 'Search city or region...'}
                  className="w-full bg-[#1C1C20] border border-white/10 rounded-xl ps-9 pe-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex-1 overflow-y-auto mt-3 divide-y divide-white/5 no-scrollbar">
                {filteredLocations.map((loc, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectLocation(loc)}
                    className="py-2.5 px-2 flex items-center justify-between hover:bg-white/5 rounded-lg cursor-pointer tap-press transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin size={14} className="text-neutral-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-white">{isAr ? loc.name : loc.nameEn}</div>
                        <div className="text-[11px] text-neutral-500">{loc.country}</div>
                      </div>
                    </div>
                    <span className="text-[11px] text-neutral-600 font-mono">
                      {loc.lat.toFixed(1)}°, {loc.lng.toFixed(1)}°
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8. GIF PICKER MODAL */}
        <GifPickerModal
          isOpen={isGifModalOpen}
          onClose={() => setIsGifModalOpen(false)}
          onSelectGif={(url) => {
            setAttachedGif(url);
            setAttachedImage(null);
            setAttachedVideo(null);
          }}
        />

        {/* 9. PULSE Music PICKER & CUSTOM SOUND MODAL */}
        <MusicPickerModal
          isOpen={isMusicModalOpen}
          onClose={() => setIsMusicModalOpen(false)}
          onSelectMusic={(music) => {
            setAttachedMusic(music);
            setIsMusicModalOpen(false);
          }}
          currentUser={currentUser}
        />

        {/* 10. REAL QUOTE PICKER MODAL */}
        <QuotePickerModal
          isOpen={isQuotePickerOpen}
          onClose={() => setIsQuotePickerOpen(false)}
          onSelectQuote={(quote) => {
            setActiveQuotePost(quote);
            setIsQuotePickerOpen(false);
          }}
          currentUser={currentUser}
        />

        {/* 11. DRAFTS PAGE (full-screen overlay) */}
        <DraftsPage
          isOpen={showDraftsPage}
          onClose={() => setShowDraftsPage(false)}
          uid={uid}
          isAr={isAr}
          onSelectDraft={applyDraft}
        />

        {/* 12. SAVE / DISCARD SHEET */}
        {showDiscardSheet && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 animate-fade-in">
            <div className="absolute inset-0" onClick={() => setShowDiscardSheet(false)} />
            <div
              className="relative w-full max-w-md bg-[#1C1C1E] border-t border-white/10 rounded-t-3xl px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-16px_60px_rgba(0,0,0,0.9)] animate-sheet-up"
              dir={isAr ? 'rtl' : 'ltr'}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <h3 className="text-[17px] font-bold text-white text-center">
                {isAr ? 'حفظ هذه النبضة كمسودة؟' : 'Save this pulse as a draft?'}
              </h3>
              <p className="text-[13px] text-neutral-400 text-center mt-1.5 mb-5 leading-relaxed">
                {isAr
                  ? 'يمكنك العودة إليها وإكمالها لاحقاً من المسودات.'
                  : 'You can come back and finish it later from Drafts.'}
              </p>

              <div className="rounded-2xl bg-[#2C2C2E]/70 border border-white/5 divide-y divide-white/5 overflow-hidden">
                <button
                  onClick={handleSaveDraftAndClose}
                  className="w-full py-3.5 text-[15px] font-semibold text-white active:bg-white/10 transition-colors"
                >
                  {isAr ? 'حفظ كمسودة' : 'Save draft'}
                </button>
                <button
                  onClick={handleDiscardAndClose}
                  className="w-full py-3.5 text-[15px] font-semibold text-rose-400 active:bg-white/10 transition-colors"
                >
                  {isAr ? 'تجاهل النبضة' : 'Discard pulse'}
                </button>
              </div>

              <button
                onClick={() => setShowDiscardSheet(false)}
                className="w-full mt-3 py-3.5 rounded-2xl bg-white text-black text-[15px] font-bold active:opacity-80 transition-opacity"
              >
                {isAr ? 'متابعة الكتابة' : 'Keep editing'}
              </button>
            </div>
          </div>
        )}

        {/* 12.5 TOPIC PICKER SHEET */}
        {showTopicPicker && (
          <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/75 backdrop-blur-md animate-fade-in">
            <div className="absolute inset-0" onClick={() => setShowTopicPicker(false)} />
            <div
              className="relative w-full max-w-md bg-[#161618] border-t border-[#2A2A2E] rounded-t-3xl p-5 shadow-2xl animate-sheet-up max-h-[80vh] overflow-y-auto"
              dir={isAr ? 'rtl' : 'ltr'}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between pb-3 border-b border-[#222226]">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'اختيار موضوع النبضة' : 'Select Topic'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowTopicPicker(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Custom Topic Input */}
              <div className="mt-4 flex items-center gap-2">
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customTopicInput.trim()) {
                      e.preventDefault();
                      setSelectedTopic(customTopicInput.trim());
                      setCustomTopicInput('');
                      setShowTopicPicker(false);
                      try { hapticsService.light?.(); } catch {}
                    }
                  }}
                  placeholder={isAr ? 'اكتب موضوعاً مخصصاً (مثال: ذكاء اصطناعي)...' : 'Type custom topic...'}
                  className="flex-1 bg-black border border-[#2E2E32] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white transition-colors"
                />
                <button
                  type="button"
                  disabled={!customTopicInput.trim()}
                  onClick={() => {
                    if (customTopicInput.trim()) {
                      setSelectedTopic(customTopicInput.trim());
                      setCustomTopicInput('');
                      setShowTopicPicker(false);
                      try { hapticsService.light?.(); } catch {}
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold disabled:opacity-40 tap-press"
                >
                  {isAr ? 'إضافة' : 'Add'}
                </button>
              </div>

              {/* Predefined Popular Topics */}
              <div className="mt-5">
                <div className="text-[11.5px] font-semibold text-neutral-400 mb-2.5">
                  {isAr ? 'المواضيع الشائعة' : 'Popular Topics'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_TOPICS.map((topicName) => {
                    const isSelected = selectedTopic === topicName;
                    return (
                      <button
                        key={topicName}
                        type="button"
                        onClick={() => {
                          try { hapticsService.light?.(); } catch {}
                          setSelectedTopic(isSelected ? '' : topicName);
                          setShowTopicPicker(false);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all tap-press flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-white text-black font-bold shadow-md'
                            : 'bg-black/60 text-neutral-300 border border-[#2A2A2E] hover:border-neutral-500 hover:text-white'
                        }`}
                      >
                        {isSelected && <Check size={12} className="stroke-[3]" />}
                        <span>{topicName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedTopic && (
                <div className="mt-5 pt-3 border-t border-[#222226] flex items-center justify-between">
                  <span className="text-xs text-neutral-400">
                    {isAr ? 'الموضوع المحدد:' : 'Selected topic:'}{' '}
                    <span className="text-white font-bold">{selectedTopic}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTopic('');
                      setShowTopicPicker(false);
                    }}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    {isAr ? 'إزالة الموضوع' : 'Remove topic'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 13. IMAGE EDITOR MODAL */}
        <ImageEditorModal
          isOpen={isImageEditorOpen}
          onClose={() => setIsImageEditorOpen(false)}
          imageSrc={attachedImage}
          onSave={(editedBase64) => {
            setAttachedImage(editedBase64);
            setIsImageEditorOpen(false);
            showToast(isAr ? 'تم حفظ التعديلات على الصورة' : 'Image edits applied', 'success');
          }}
        />
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
