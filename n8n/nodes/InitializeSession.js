const staticData = $getWorkflowStaticData('global');
const data = $input.first().json;
const visionRaw = data.visionAnalysis;
const chatId = data.chatId;
const propertyType = data.propertyType || staticData[`prop_${chatId}`] || 'apartment';
const propertyInfo = data.propertyInfo || staticData[`propertyInfo_${chatId}`] || null;

// Parse vision analysis
let cleaned = visionRaw.trim();
if (cleaned.startsWith('```')) {
  cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
}
const analysis = JSON.parse(cleaned);

// Create session
const sessionKey = `session_${chatId}`;
const photoUrls = data.photoUrls;

staticData[sessionKey] = {
  phase: 'selecting',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  style: data.style,
  styleLabel: data.styleLabel,
  propertyType,
  propertyInfo,
  currentRoomIndex: 0,
  totalRooms: analysis.rooms.length,
  rooms: analysis.rooms.map((room, i) => ({
    index: i,
    roomType: room.roomType,
    roomLabel: room.roomLabel,
    photoUrl: photoUrls[i] ? photoUrls[i].url : photoUrls[0].url,
    beforePhotoUrl: photoUrls[i] ? (photoUrls[i].originalUrl || photoUrls[i].url) : photoUrls[0].url,
    visionData: room,
    options: [],
    galleryMessageId: null,
    selectedUrl: null,
    regenerationCount: 0
  }))
};

// Clean up accumulated photo/style/album/autoStart keys
const photoPrefix = `photo_${chatId}_`;
Object.keys(staticData).filter(k => k.startsWith(photoPrefix)).forEach(k => delete staticData[k]);
const mgPrefix = `mg_${chatId}_`;
Object.keys(staticData).filter(k => k.startsWith(mgPrefix)).forEach(k => delete staticData[k]);
delete staticData[`style_${chatId}`];
delete staticData[`prop_${chatId}`];
delete staticData[`autoStart_${chatId}`];
delete staticData[`propertyInfo_${chatId}`];
delete staticData[`awaiting_info_${chatId}`];

return [{ json: { chatId, session: staticData[sessionKey] } }];
