import re

compose_path = r'C:/Users/DELL/.gemini/antigravity/scratch/pulse-app/src/components/ComposeModal.jsx'
post_detail_path = r'C:/Users/DELL/.gemini/antigravity/scratch/pulse-app/src/pages/PostDetailPage.jsx'

# ==========================================
# 1. Update ComposeModal.jsx
# ==========================================
with open(compose_path, 'r', encoding='utf-8') as f:
    c = f.read()

# Add import
if 'videoOptimizer' not in c:
    c = c.replace(
        "import { draftService } from '../services/draftService';",
        "import { draftService } from '../services/draftService';\nimport { processVideoPreUpload, formatVideoDuration } from '../utils/videoOptimizer';"
    )
    print("Added videoOptimizer import.")

# Add state variables
old_video_state = "const [attachedVideo, setAttachedVideo] = useState(null);"
new_video_state = """const [attachedVideo, setAttachedVideo] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPoster, setVideoPoster] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);"""

if old_video_state in c and "videoFile" not in c:
    c = c.replace(old_video_state, new_video_state)
    print("Added video state variables.")

# Reset composer update
old_reset = """    setAttachedImage(null);
    setAttachedVideo(null);
    setAttachedGif(null);"""

new_reset = """    setAttachedImage(null);
    setAttachedVideo(null);
    setVideoFile(null);
    setVideoPoster(null);
    setVideoDuration(null);
    setIsProcessingVideo(false);
    setAttachedGif(null);"""

if old_reset in c:
    c = c.replace(old_reset, new_reset)
    print("Updated resetComposer for video.")

# Replace handleImageSelect and handleVideoSelect with unified smart handleMediaSelect
old_handlers = """  // Image select
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImageToBase64(file, 1200, 1200, 0.82);
        setAttachedImage(compressedBase64);
        setAttachedGif(null);
      } catch (err) {
        console.error(err);
        showToast(isAr ? 'حدث خطأ أثناء معالجة الصورة' : 'Error compressing image', 'error');
      }
    }
  };

  // Video select
  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        showToast(isAr 
          ? 'حجم الفيديو كبير، يرجى اختيار مقطع أقل من 25 ميجابايت.'
          : 'Video too large (limit 25MB).', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setAttachedVideo(uploadEvent.target.result);
        setAttachedGif(null);
      };
      reader.readAsDataURL(file);
    }
  };"""

new_handlers = """  // Unified Media Select (Smart Photos & Videos with Cloudinary Compression)
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
  const handleVideoSelect = handleMediaSelect;"""

if old_handlers in c:
    c = c.replace(old_handlers, new_handlers)
    print("Replaced handleImageSelect and handleVideoSelect.")
else:
    print("Warning: old_handlers pattern not matched exactly.")

# Update file input accept attributes
old_inputs = """        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          type="file"
          ref={videoInputRef}
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={handleVideoSelect}
        />"""

new_inputs = """        {/* Hidden File Inputs */}
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
        />"""

if old_inputs in c:
    c = c.replace(old_inputs, new_inputs)
    print("Updated file input accepts.")

# Update publish logic for video
old_pub = """      // 2. Cloudinary Video Upload
      let finalVideoUrl = attachedVideo || null;
      if (attachedVideo && attachedVideo.startsWith('data:video')) {
        try {
          finalVideoUrl = await cloudinaryService.uploadVideo(attachedVideo, 'pulse_videos');
        } catch (cloudErr) {
          console.warn('Cloudinary post video upload error:', cloudErr);
        }
      }"""

new_pub = """      // 2. Cloudinary Video Upload with Intelligent Perceptual Compression
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
      }"""

if old_pub in c:
    c = c.replace(old_pub, new_pub)
    print("Updated video publish logic.")

# Update post object creation to include videoPoster and videoDuration
old_post_obj = """        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        isGif: !!attachedGif,"""

new_post_obj = """        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        videoPoster: finalVideoPoster,
        videoDuration: videoDuration,
        isGif: !!attachedGif,"""

if old_post_obj in c:
    c = c.replace(old_post_obj, new_post_obj)
    print("Updated newPost object to include videoPoster and videoDuration.")

# Update attached video UI preview in modal
old_video_ui = """              {/* Attached Media: Video */}
              {attachedVideo && (
                <div className="relative mt-3 rounded-2xl overflow-hidden border border-white/10 max-h-64 group bg-black flex items-center justify-center">
                  <video src={attachedVideo} playsInline muted loop autoPlay className="w-full h-full object-contain max-h-64" />
                  <button
                    onClick={() => setAttachedVideo(null)}
                    className="absolute top-2.5 end-2.5 p-1.5 rounded-full bg-black/80 text-white hover:bg-neutral-800 tap-press transition-colors z-10"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}"""

new_video_ui = """              {/* Attached Media: Video with Smart Cloudinary Compression Preview */}
              {isProcessingVideo && (
                <div className="mt-3 p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-center gap-3 text-xs text-neutral-300 animate-pulse">
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
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
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
              )}"""

if old_video_ui in c:
    c = c.replace(old_video_ui, new_video_ui)
    print("Updated attached video UI preview.")

# Add Video row in More Menu
old_more_row = """                      {/* Row 1: Text (Focuses & smooth-scrolls to textarea) */}
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
                      </div>"""

new_more_row = """                      {/* Row 0: Video Direct Select */}
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
                      </div>"""

if old_more_row in c and "Row 0: Video" not in c:
    c = c.replace(old_more_row, new_more_row)
    print("Added Video item to More menu.")

with open(compose_path, 'w', encoding='utf-8') as f:
    f.write(c)

print("ComposeModal.jsx updated successfully!")

# ==========================================
# 2. Update PostDetailPage.jsx
# ==========================================
with open(post_detail_path, 'r', encoding='utf-8') as f:
    pd = f.read()

if "import PulseVideoPlayer from '../components/PulseVideoPlayer';" not in pd:
    pd = pd.replace(
        "import PulseMediaViewer from '../components/PulseMediaViewer';",
        "import PulseMediaViewer from '../components/PulseMediaViewer';\nimport PulseVideoPlayer from '../components/PulseVideoPlayer';"
    )
    print("Added PulseVideoPlayer to PostDetailPage.jsx.")

old_detail_video = """          {/* Attached Video */}
          {post.videoUrl && (
            <div 
              onClick={() => setViewerImage({ url: post.videoUrl, title: post.content, mediaType: 'video' })}
              className="my-3 rounded-2xl overflow-hidden border border-[#222226] bg-[#0A0A0C] max-h-[520px] w-full flex items-center justify-center cursor-pointer relative"
            >
              <video
                src={post.videoUrl}
                controls
                className="w-full max-h-[520px] object-contain rounded-2xl"
              />
            </div>
          )}"""

new_detail_video = """          {/* Attached Video with Seamless In-Feed Player & Cloudinary Poster */}
          {post.videoUrl && (
            <div className="my-3 w-full max-w-full overflow-hidden rounded-2xl">
              <PulseVideoPlayer
                src={post.videoUrl}
                poster={post.videoPoster}
                onOpenViewer={() => setViewerImage({ url: post.videoUrl, title: post.content, mediaType: 'video' })}
              />
            </div>
          )}"""

if old_detail_video in pd:
    pd = pd.replace(old_detail_video, new_detail_video)
    print("Updated video player in PostDetailPage.jsx.")

with open(post_detail_path, 'w', encoding='utf-8') as f:
    f.write(pd)

print("PostDetailPage.jsx updated successfully!")
