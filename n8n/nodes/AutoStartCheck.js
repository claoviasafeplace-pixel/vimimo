// AutoStartCheck — Auto-trigger pipeline when album + style are both ready
// Triggered from SaveStyleChoice. If album photos exist + style set → start pipeline without /go.
const staticData = $getWorkflowStaticData('global');
const data = $input.first().json;
const chatId = data.chatId;
const fifteenMin = 15 * 60 * 1000;

// Only auto-trigger if an album was sent (not for individual photos)
// AccumulatePhoto stores album markers as mg_{chatId}_{mediaGroupId}
const mgPrefix = `mg_${chatId}_`;
const hasAlbum = Object.keys(staticData).some(k => k.startsWith(mgPrefix));
if (!hasAlbum) return [];

// Check style is set
const styleKey = `style_${chatId}`;
const styleData = staticData[styleKey];
if (!styleData || !styleData.style) return [];

// Check photos exist
const photoPrefix = `photo_${chatId}_`;
const photoKeys = Object.keys(staticData).filter(k => k.startsWith(photoPrefix));
const photos = photoKeys.map(k => staticData[k]).sort((a, b) => a.timestamp - b.timestamp);
if (photos.length === 0) return [];

// Check no active session (prevent double-trigger with /go)
// Also clean stale sessions (>15min) that would otherwise block forever
const sessionKey = `session_${chatId}`;
if (staticData[sessionKey]) {
  const sessionAge = Date.now() - (staticData[sessionKey].updatedAt || staticData[sessionKey].createdAt || 0);
  if (sessionAge < fifteenMin) return []; // Recent session — don't interfere
  // Stale session — clean it up and proceed
  delete staticData[sessionKey];
}

// Prevent multiple auto-triggers (with 15min timeout for recovery after failure)
const autoKey = `autoStart_${chatId}`;
if (staticData[autoKey] && (Date.now() - staticData[autoKey]) < fifteenMin) return [];
staticData[autoKey] = Date.now();

// NOTE: Do NOT set preliminary session here — if pipeline fails, it would block
// both auto-start and /go for 15 minutes. The pipeline creates its own session
// in InitializeSession. Concurrent /go is low risk and handled gracefully.

return [{ json: {
  chatId,
  photos,
  style: styleData.style,
  styleLabel: styleData.label || 'Moderne',
  totalPhotos: photos.length,
  propertyType: staticData[`prop_${chatId}`] || 'apartment',
  propertyInfo: staticData[`propertyInfo_${chatId}`] || null,
  fromAlbum: true
}}];
