import React, { useState, useRef, useEffect, useCallback } from 'react';

// --- HELPER FUNCTIONS & CONFIG ---
const loadScript = (src) => new Promise((resolve, reject) => {
  if (document.querySelector(`script[src="${src}"]`)) return resolve();
  const s = document.createElement('script');
  s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
  document.head.appendChild(s);
});

// Load Stylish Google Fonts + Custom Fonts
const loadGoogleFonts = () => {
  if (document.getElementById('google-fonts-link')) return;
  const link = document.createElement('link');
  link.id = 'google-fonts-link';
  link.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Dancing+Script:wght@700&family=Lobster&family=Pacifico&family=Fredoka+One&family=Great+Vibes&family=Luckiest+Guy&family=Roboto:wght@400;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
};

const CLOUD_NAME = "dtoxupd4o";
const UPLOAD_PRESET = "LineArt";

// --- UPDATE 1: ADDED MORE PRESETS ---
const MACHINE_PRESETS = {
  "40mm v2": { size: 37.0, bedWidth: 37, bedHeight: 37 },
  "40mm": { size: 40.0, bedWidth: 40, bedHeight: 40 },
  "50mm": { size: 50.0, bedWidth: 50, bedHeight: 50 },
  "60mm": { size: 60.0, bedWidth: 60, bedHeight: 60 },
  "70mm": { size: 70.0, bedWidth: 70, bedHeight: 70 },
  "80mm": { size: 80.0, bedWidth: 80, bedHeight: 80 },
  "90mm": { size: 90.0, bedWidth: 90, bedHeight: 90 },
  "100mm": { size: 100.0, bedWidth: 100, bedHeight: 100 },
  "30mm LaserPix": { size: 60.0, bedWidth: 60, bedHeight: 60 },
  "35mm LaserPix": { size: 70.0, bedWidth: 70, bedHeight: 70 },
  "40mm LaserPix": { size: 80.0, bedWidth: 80, bedHeight: 80 },
  "45mm LaserPix": { size: 90.0, bedWidth: 90, bedHeight: 90 },
  "50mm LaserPix": { size: 100.0, bedWidth: 100, bedHeight: 100 },
  "HD Download": { size: 1000.0, bedWidth: 1000, bedHeight: 1000 },
};

// Expanded Font List
const FONTS = [
  'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Impact',
  'Bangers', 'Pacifico', 'Dancing Script', 'Lobster', 'Fredoka One',
  'Great Vibes', 'Luckiest Guy'
];

// --- THEMES ---
const THEMES = {
  light: { bg: '#F5F5DC', card: '#ffffff', text: '#5D4037', subText: '#8D6E63', accent: '#D7CCC8', frame: '#000', frameBorder: '#5D4037', buttonSec: '#EFEBE9', buttonText: '#5D4037', guideColor: '#FF4081' },
  dark: { bg: '#212121', card: '#323232', text: '#E0E0E0', subText: '#B0BEC5', accent: '#424242', frame: '#000', frameBorder: '#757575', buttonSec: '#424242', buttonText: '#E0E0E0', guideColor: '#FF4081' }
};

// --- IMAGE PROCESSING FUNCTIONS ---
const computeIntegralImage=(g,w,h)=>{const i=new Float32Array(w*h);for(let y=0;y<h;y++){let s=0;for(let x=0;x<w;x++){s+=g[y*w+x];i[y*w+x]=y===0?s:s+i[(y-1)*w+x]}}return i};
const getRectSum=(i,w,h,x1,y1,x2,y2)=>{x1=Math.max(0,x1);y1=Math.max(0,y1);x2=Math.min(w-1,x2);y2=Math.min(h-1,y2);const A=(x1>0&&y1>0)?i[(y1-1)*w+(x1-1)]:0,B=(y1>0)?i[(y1-1)*w+x2]:0,C=(x1>0)?i[y2*w+(x1-1)]:0,D=i[y2*w+x2];return D-B-C+A};
const applyBoxBlur=(g,w,h,b)=>{if(b<=0)return g;const r=Math.max(1,Math.floor(w*(b/1000))),bd=new Float32Array(w*h);for(let y=0;y<h;y++){for(let x=0;x<w;x++){let s=0,c=0;for(let ky=-r;ky<=r;ky++){for(let kx=-r;kx<=r;kx++){s+=g[Math.min(h-1,Math.max(0,y+ky))*w+Math.min(w-1,Math.max(0,x+kx))];c++}}bd[y*w+x]=s/c}}return bd};
const applyDithering=(g,w,h)=>{for(let y=0;y<h;y++){for(let x=0;x<w;x++){const i=y*w+x,o=g[i],n=o<128?0:255,q=o-n;g[i]=n;if(x+1<w)g[i+1]+=q*7/16;if(x-1>=0&&y+1<h)g[i+w-1]+=q*3/16;if(y+1<h)g[i+w]+=q*5/16;if(x+1<w&&y+1<h)g[i+w+1]+=q*1/16}}};

// --- THROTTLING UTILITIES ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sendCommandsWithDelay = async (commands) => {
  for (const cmd of commands) {
    if (window.electron) {
      window.electron.sendGcode(cmd);
      await delay(100);
    }
  }
};

// --- MAIN COMPONENT ---
function App() {
  // State
  const [step, setStep] = useState('camera');
  const [statusText, setStatusText] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null); 
  const [originalImage, setOriginalImage] = useState(null); 
  const [processedData, setProcessedData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeConnectionType, setActiveConnectionType] = useState('usb'); 
  const [portName, setPortName] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isEngravingUnlocked, setIsEngravingUnlocked] = useState(false);
  const [isAligned, setIsAligned] = useState(false);
  const [currentPresetName, setCurrentPresetName] = useState("50mm");
  const [jogStep, setJogStep] = useState(10);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(null);

  // --- HARDWARE CONFIGURATION ---
  const [hardwareProfiles, setHardwareProfiles] = useState([]);
  const [selectedHardware, setSelectedHardware] = useState('esp32');
  const [selectedBaudRate, setSelectedBaudRate] = useState(115200);
  const [availableBaudRates, setAvailableBaudRates] = useState([115200]);
  const [showHardwareSettings, setShowHardwareSettings] = useState(false);

  // --- BUSINESS / TRANSACTION LOGS ---
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // --- DESIGN TOOL STATE ---
  const [showDesignTool, setShowDesignTool] = useState(false);
  const [wasInDesignMode, setWasInDesignMode] = useState(false);
   
  // Design Layers
  const [layers, setLayers] = useState([
    { id: 1, type: 'text', text: "NAME", x: 500, y: 500, fontSize: 150, fontFamily: 'Bangers', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'center', rotation: 0 }
  ]);
  const [selectedLayerId, setSelectedLayerId] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [guides, setGuides] = useState({ x: false, y: false });

  // Asset Addition State
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetSourceMode, setAssetSourceMode] = useState(null);
  const [tempAssetImage, setTempAssetImage] = useState(null);
  const [previewAssetUrl, setPreviewAssetUrl] = useState(null);
  const [isProcessingAsset, setIsProcessingAsset] = useState(false);

  // Cropper & Preview Zoom State
  const [cropState, setCropState] = useState({ x: 0, y: 0, zoom: 1 });
  const [previewZoom, setPreviewZoom] = useState({ x: 0, y: 0, zoom: 1 });

  // Asset Processing Options
  const [assetProcessSettings, setAssetProcessSettings] = useState({
    enableLineArt: false, threshold: 10, thickness: 15, dither: false, invert: false, bgRemovalMethod: 'none'
  });

  const [settings, setSettings] = useState({
    power: 60, speed: 2000, invert: false, dither: false, enableLineArt: false, bgRemovalMethod: 'none',
    // --- MASK & FLIP STATE ---
    maskShape: 'none', // 'none' or 'circle' (square option removed)
    flipH: false, flipV: false,
    size: 50.0, bedWidth: 50, bedHeight: 50, alignPower: 0.1, linesPerMm: 4,
    sketchParams: { threshold: 1, thickness: 7, smoothness: 0 }
  });

  // Refs
  const videoRef = useRef(null); 
  const assetVideoRef = useRef(null); 
  const streamRef = useRef(null);
  const previewCanvasRef = useRef(null); 
  const cropImgRef = useRef(null); 
  const assetCropRef = useRef(null);
  const fileInputRef = useRef(null); 
  const assetFileInputRef = useRef(null);
  const gcodeQueueRef = useRef([]); 
  const currentLineRef = useRef(0);
  const stopRef = useRef(false); 
  const pausedRef = useRef(false); 
  const bodyPixModelRef = useRef(null); 
  const designContainerRef = useRef(null);

  const theme = isDarkMode ? THEMES.dark : THEMES.light;

  const showToast = (message) => {
      setToast({ show: true, message });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const triggerHaptic = () => {
      if (navigator.vibrate) navigator.vibrate(50);
  };

  // --- UPDATE 3: LOAD TRANSACTIONS ON MOUNT ---
  useEffect(() => {
    const saved = localStorage.getItem('laserpix_transactions');
    if (saved) {
        setTransactions(JSON.parse(saved));
    }
  }, []);

  // --- HARDWARE CONFIGURATION INITIALIZATION ---
  useEffect(() => {
    if (!window.electron) return; // Skip if not in Electron
    
    const initHardware = async () => {
      try {
        const profiles = await window.electron.getHardwareProfiles();
        setHardwareProfiles(profiles);
        
        // Load current hardware config
        const current = await window.electron.getCurrentHardware();
        setSelectedHardware(current.profileId);
        setSelectedBaudRate(current.baudRate);
        
        // Set available baud rates for selected hardware
        const selectedProfile = profiles.find(p => p.id === current.profileId);
        if (selectedProfile) {
          setAvailableBaudRates(selectedProfile.baudRates);
        }
      } catch (err) {
        console.error('Failed to load hardware profiles:', err);
      }
    };
    
    initHardware();
  }, []);

  const saveTransaction = () => {
    const newTx = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        preset: currentPresetName,
        power: settings.power,
        speed: settings.speed,
        status: 'Completed'
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    localStorage.setItem('laserpix_transactions', JSON.stringify(updated));
  };
   
  const clearHistory = () => {
      if(window.confirm("Clear all transaction history?")) {
          setTransactions([]);
          localStorage.removeItem('laserpix_transactions');
      }
  };

  // --- UPDATE 2: SAVE PICTURE HELPER ---
  const downloadImage = () => {
      const canvas = previewCanvasRef.current;
      if (canvas) {
          const link = document.createElement('a');
          link.download = `laserpix-${new Date().toISOString().slice(0,10)}.png`;
          link.href = canvas.toDataURL();
          link.click();
          showToast("Image Saved to Gallery!");
      }
  };

  useEffect(() => {
    loadGoogleFonts();
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- STYLES INJECTION ---
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes toastFadeIn { from { opacity: 0; margin-top: -20px; } to { opacity: 1; margin-top: 0; } }
      @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); } }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .anim-btn { transition: transform 0.1s ease, filter 0.2s ease; }
      .anim-btn:active { transform: scale(0.95); }
      @media (hover: hover) { .anim-btn:hover { transform: scale(1.05); filter: brightness(1.1); cursor: pointer; } }
      details > summary { list-style: none; cursor: pointer; background: ${theme.buttonSec}; padding: 10px; border-radius: 8px; font-weight: bold; color: ${theme.text}; border: 1px solid ${theme.accent}; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center; }
      details > summary::after { content: '▼'; font-size: 0.8rem; transition: 0.3s; }
      details[open] > summary::after { transform: rotate(180deg); }
      details[open] > summary { border-radius: 8px 8px 0 0; border-bottom: none; }
      details > div { padding: 10px; border: 1px solid ${theme.accent}; border-top: none; border-radius: 0 0 8px 8px; background: ${isDarkMode ? '#424242' : 'white'}; margin-bottom: 10px; }
      .scrollable-content::-webkit-scrollbar { width: 6px; }
      .scrollable-content::-webkit-scrollbar-track { background: transparent; }
      .scrollable-content::-webkit-scrollbar-thumb { background: ${theme.accent}; border-radius: 4px; }
      .scrollable-content { overflow-x: hidden !important; width: 100%; box-sizing: border-box; }
      .layer-item { user-select: none; cursor: grab; position: absolute; transform: translate(-50%, -50%); white-space: pre-wrap; width: max-content; max-width: 100%; }
      .layer-item:active { cursor: grabbing; }
      .layer-item.selected { outline: 2px dashed #FFB74D; outline-offset: 4px; }
      .guide-v { position: absolute; top: 0; bottom: 0; left: 50%; border-left: 2px dashed ${theme.guideColor}; transform: translateX(-50%); pointer-events: none; z-index: 100; }
      .guide-h { position: absolute; left: 0; right: 0; top: 50%; border-top: 2px dashed ${theme.guideColor}; transform: translateY(-50%); pointer-events: none; z-index: 100; }
      .loading-spinner { border: 4px solid rgba(0, 0, 0, 0.1); border-left-color: ${theme.accent}; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; }
      table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
      th, td { text-align: left; padding: 8px; border-bottom: 1px solid ${theme.accent}; color: ${theme.text}; }
      th { background-color: ${theme.buttonSec}; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [theme, isDarkMode]);

  // --- CONNECT LOGIC ---
  useEffect(() => {
    let scanInterval;
    let isScanning = true;

    const attemptConnection = async () => {
      if (!window.electron || isConnected) return;
      setStatusText("Scanning USB...");
      
      const usbRes = await window.electron.connectMachine('usb');
      if (usbRes.success) {
        setIsConnected(true);
        setActiveConnectionType('usb'); 
        setStatusText(`USB Connected`);
        setPortName(`USB: ${usbRes.path}`);
        isScanning = false;
        return;
      }

      setStatusText("Scanning WiFi...");
      const wifiRes = await window.electron.connectMachine('wifi');
      if (wifiRes.success) {
        setIsConnected(true);
        setActiveConnectionType('wifi'); 
        setStatusText("WiFi Connected");
        setPortName("WiFi: 192.168.4.1");
        isScanning = false;
        return;
      }
      setStatusText("Retrying...");
    };

    attemptConnection();
    scanInterval = setInterval(() => {
      if (isScanning && !isConnected) {
        attemptConnection();
      }
    }, 5000);

    if (window.electron) {
        window.electron.onSerialStatus((status) => {
            const connected = status === 'connected';
            setIsConnected(connected);
            setStatusText(connected ? "Connected" : "Disconnected");
            if (!connected) isScanning = true;
        });
        
        window.electron.onSerialData((data) => {
            if (step === 'engraving' && data.includes('ok')) {
                sendNextLine(); 
            }
        });
    }

    return () => clearInterval(scanInterval);
  }, [isConnected, step]); 

  // --- CAMERA LOGIC ---
  const startCamera = async (targetRef) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
        streamRef.current = stream;
        if (targetRef.current) { targetRef.current.srcObject = stream; targetRef.current.play().catch(e => console.warn("Play error:", e)); }
      } catch (err) { console.error(err); showToast("Camera Error: " + err.message); }
  };

  const stopCamera = () => {
      if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
      setIsFlashOn(false);
  };

  // --- HARDWARE CONFIGURATION HANDLERS ---
  const handleHardwareChange = async (profileId) => {
    setSelectedHardware(profileId);
    
    if (window.electron) {
      try {
        const result = await window.electron.setHardwareProfile(profileId);
        if (result.success) {
          // Update available baud rates
          const profile = hardwareProfiles.find(p => p.id === profileId);
          if (profile) {
            setAvailableBaudRates(profile.baudRates);
            setSelectedBaudRate(profile.defaultBaudRate);
          }
          showToast(`Hardware set to: ${result.profile}`);
        }
      } catch (err) {
        console.error('Failed to set hardware profile:', err);
        showToast('Error setting hardware profile');
      }
    }
  };

  const handleBaudRateChange = async (baudRate) => {
    setSelectedBaudRate(baudRate);
    
    if (window.electron) {
      try {
        const result = await window.electron.setBaudRate(baudRate);
        if (result.success) {
          showToast(`Baud rate set to: ${baudRate}`);
        }
      } catch (err) {
        console.error('Failed to set baud rate:', err);
        showToast('Error setting baud rate');
      }
    }
  };

  useEffect(() => {
    if (step === 'camera' && !showDesignTool) startCamera(videoRef);
    else if (showAssetModal && assetSourceMode === 'camera') startCamera(assetVideoRef);
    else stopCamera();
    
    return () => stopCamera();
  }, [step, showDesignTool, showAssetModal, assetSourceMode]);

  const toggleFlash = async () => {
      if (!streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      try {
          const capabilities = track.getCapabilities();
          if (!capabilities.torch) { showToast("Flashlight not supported"); return; }
          await track.applyConstraints({ advanced: [{ torch: !isFlashOn }] });
          setIsFlashOn(!isFlashOn);
      } catch (err) { console.error("Flash", err); showToast("Error toggling flash"); }
  };

  // --- PREVIEW & CROP ---
  useEffect(() => { if (step === 'preview' && originalImage && previewCanvasRef.current) generatePreview(); }, [step, originalImage, settings]);

  const handleMainCapture = () => {
    triggerHaptic();
    setWasInDesignMode(false);
    if (!videoRef.current) return;
    
    if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0) {
        showToast("Camera not ready yet");
        return;
    }

    captureFromVideo(videoRef.current, (data) => {
        setCapturedImage(data);
        setCropState({ x: 0, y: 0, zoom: 1 });
        setStep('crop');
    });
  };

  const captureFromVideo = (videoEl, callback) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoEl.videoWidth; tempCanvas.height = videoEl.videoHeight;
    const ctx = tempCanvas.getContext('2d'); ctx.drawImage(videoEl, 0, 0);
    const size = Math.min(tempCanvas.width, tempCanvas.height);
    const x = (tempCanvas.width - size) / 2; const y = (tempCanvas.height - size) / 2;
    const squareCanvas = document.createElement('canvas');
    squareCanvas.width = size; squareCanvas.height = size;
    const sqCtx = squareCanvas.getContext('2d');
    sqCtx.drawImage(tempCanvas, x, y, size, size, 0, 0, size, size);
    callback(squareCanvas.toDataURL('image/png'));
  };

  // --- DESIGN TOOL LOGIC ---
  const activeLayer = layers.length > 0 
      ? (layers.find(l => l.id === selectedLayerId) || layers[layers.length - 1])
      : null;

  const updateLayer = (key, value) => {
    setLayers(ls => ls.map(l => l.id === selectedLayerId ? { ...l, [key]: value } : l));
  };

  const addTextLayer = () => {
    const newId = Date.now();
    setLayers([...layers, { id: newId, type: 'text', text: "NEW TEXT", x: 500, y: 500, fontSize: 150, fontFamily: 'Bangers', fontWeight: 'normal', fontStyle: 'normal', textAlign: 'center', rotation: 0 }]);
    setSelectedLayerId(newId);
  };

  const deleteLayer = () => {
    if (layers.length <= 0) return;
    const newLayers = layers.filter(l => l.id !== selectedLayerId);
    setLayers(newLayers);
    if(newLayers.length > 0) setSelectedLayerId(newLayers[newLayers.length - 1].id);
  };

  const moveLayer = (direction) => {
    if (!activeLayer) return;
    const index = layers.findIndex(l => l.id === selectedLayerId);
    if (index === -1) return;
    const newLayers = [...layers];
    
    if (direction === 'down' && index > 0) {
       [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
    } 
    else if (direction === 'up' && index < layers.length - 1) {
       [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
    }
    setLayers(newLayers);
  };

  const handleDragStart = (e, id) => {
    e.stopPropagation();
    setSelectedLayerId(id);
    setIsDragging(true);
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const rect = designContainerRef.current.getBoundingClientRect();
    const scale = 1000 / rect.width;
    const layer = layers.find(l => l.id === id);
    setDragOffset({ x: (clientX - rect.left) * scale - layer.x, y: (clientY - rect.top) * scale - layer.y });
  };

  const handleDragMove = useCallback((e) => {
    if (!isDragging || !designContainerRef.current) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = designContainerRef.current.getBoundingClientRect();
    const scale = 1000 / rect.width;
    
    let newX = (clientX - rect.left) * scale - dragOffset.x;
    let newY = (clientY - rect.top) * scale - dragOffset.y;
    
    const SNAP_THRESHOLD = 20; 
    let snappedX = false;
    let snappedY = false;

    if (Math.abs(newX - 500) < SNAP_THRESHOLD) {
        if (Math.abs(newX - 500) > 2) triggerHaptic(); 
        newX = 500;
        snappedX = true;
    }
    if (Math.abs(newY - 500) < SNAP_THRESHOLD) {
        if (Math.abs(newY - 500) > 2) triggerHaptic();
        newY = 500;
        snappedY = true;
    }

    setGuides({ x: snappedX, y: snappedY });
    
    newX = Math.max(-200, Math.min(1200, newX));
    newY = Math.max(-200, Math.min(1200, newY));
    
    setLayers(ls => ls.map(l => l.id === selectedLayerId ? { ...l, x: newX, y: newY } : l));
  }, [isDragging, dragOffset, selectedLayerId]);

  const handleDragEnd = () => { setIsDragging(false); setGuides({x:false, y:false}); };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false }); window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove); window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove]);

  // --- ASSET ADDITION WORKFLOW ---
  const handleAssetCapture = () => {
      if (!assetVideoRef.current) return;
      captureFromVideo(assetVideoRef.current, (data) => {
          setTempAssetImage(data);
          setAssetSourceMode('crop'); 
          setCropState({ x: 0, y: 0, zoom: 1 });
      });
  };

  useEffect(() => {
      if (!tempAssetImage) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1500;
          let w = img.width; let h = img.height;
          if(w > maxDim || h > maxDim){
              if(w>h){ h = h*(maxDim/w); w=maxDim; } else { w = w*(maxDim/h); h=maxDim; }
          }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const imageData = ctx.getImageData(0, 0, w, h);
          const data = imageData.data;
          
          let gray = new Float32Array(w * h);
          for (let i = 0; i < data.length; i += 4) {
              gray[i/4] = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
          }

          if (assetProcessSettings.enableLineArt) {
              const blurred = applyBoxBlur(gray, w, h, 0); 
              const integral = computeIntegralImage(blurred, w, h);
              const radius = Math.max(2, Math.floor(w * (assetProcessSettings.thickness / 1000)));
              const thresholdPercent = 1.0 - (assetProcessSettings.threshold / 100);
              const outputBuffer = new Uint8ClampedArray(w * h);
              
              for (let y = 0; y < h; y++) {
                  for (let x = 0; x < w; x++) {
                      const idx = y * w + x;
                      const x1 = x - radius; const y1 = y - radius;
                      const x2 = x + radius; const y2 = y + radius;
                      const area = (Math.min(w - 1, x2) - Math.max(0, x1) + 1) * (Math.min(h - 1, y2) - Math.max(0, y1) + 1);
                      const localAvg = getRectSum(integral, w, h, x1, y1, x2, y2) / area;
                      outputBuffer[idx] = (blurred[idx] < (localAvg * thresholdPercent)) ? 0 : 255;
                  }
              }
              for(let i=0; i<gray.length; i++) gray[i] = outputBuffer[i];
          }

          if (assetProcessSettings.dither) applyDithering(gray, w, h);

          for (let i = 0; i < data.length; i += 4) {
              let val = gray[i/4];
              if (assetProcessSettings.invert) val = 255 - val;
              // For preview, respect the invert setting; do not auto-invert by default
              const displayVal = assetProcessSettings.invert ? (255 - val) : val;
              data[i] = displayVal; data[i+1] = displayVal; data[i+2] = displayVal; data[i+3] = 255;
          }
          ctx.putImageData(imageData, 0, 0);
          setPreviewAssetUrl(canvas.toDataURL());
      };
      
      if (tempAssetImage.startsWith('http')) {
          img.src = tempAssetImage + (tempAssetImage.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
      } else {
          img.src = tempAssetImage;
      }
  }, [tempAssetImage, assetProcessSettings]);

  const processAssetBackgroundRemoval = async () => { 
    if (!tempAssetImage || assetProcessSettings.bgRemovalMethod === 'none') return;
    setIsProcessingAsset(true);
    showToast("Processing Background...");
    try {
      let currentImg = tempAssetImage;
      if (assetProcessSettings.bgRemovalMethod === 'local') {
        const model = await loadBodyPix();
        const img = new Image(); img.crossOrigin = 'anonymous';
        await new Promise(res => { img.onload = res; img.src = currentImg; });
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        const segmentation = await model.segmentPerson(canvas, { internalResolution: 'medium', segmentationThreshold: 0.7 });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) { if (segmentation.data[i / 4] !== 1) imageData.data[i + 3] = 0; }
        ctx.putImageData(imageData, 0, 0);
        currentImg = canvas.toDataURL('image/png');
      } else if (assetProcessSettings.bgRemovalMethod === 'cloud') {
        const resBlob = await fetch(currentImg); const blob = await resBlob.blob();
        const formData = new FormData(); formData.append("file", blob); formData.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if(data.error) throw new Error(data.error.message);
        currentImg = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_background_removal/${data.public_id}.png`;
      }
      setTempAssetImage(currentImg); 
      showToast("Background Removed!");
    } catch (err) { console.error(err); showToast('Error: ' + err.message); } finally { setIsProcessingAsset(false); }
  };

  const confirmAssetCrop = () => {
      const imgEl = assetCropRef.current;
      const containerEl = imgEl ? imgEl.parentElement : null;
      if (!imgEl || !containerEl) return;
      
      // Use actual rendered positions (getBoundingClientRect handles all transforms)
      const containerRect = containerEl.getBoundingClientRect();
      const imgRect = imgEl.getBoundingClientRect();
      
      const natW = imgEl.naturalWidth;
      const natH = imgEl.naturalHeight;
      
      // How many source pixels per rendered pixel
      const sxPerPx = natW / imgRect.width;
      const syPerPx = natH / imgRect.height;
      
      // Map container bounds to source image coordinates
      const srcXf = (containerRect.left - imgRect.left) * sxPerPx;
      const srcYf = (containerRect.top - imgRect.top) * syPerPx;
      const srcWf = containerRect.width * sxPerPx;
      const srcHf = containerRect.height * syPerPx;
      
      // Extract a centered square region to avoid stretching
      const squareSize = Math.min(srcWf, srcHf);
      const srcX0 = Math.max(0, Math.min(natW, srcXf + (srcWf - squareSize) / 2));
      const srcY0 = Math.max(0, Math.min(natH, srcYf + (srcHf - squareSize) / 2));
      const srcX1 = Math.min(natW, srcX0 + squareSize);
      const srcY1 = Math.min(natH, srcY0 + squareSize);
      
      const actualSrcW = Math.max(0, srcX1 - srcX0);
      const actualSrcH = Math.max(0, srcY1 - srcY0);
      
      // Create output canvas (square)
      const outputSize = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputSize, outputSize);

      ctx.save();
      // Apply flips
      if (settings.flipH || settings.flipV) {
          const tx = settings.flipH ? outputSize : 0;
          const ty = settings.flipV ? outputSize : 0;
          ctx.translate(tx, ty);
          ctx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
      }
      // Circle mask is only applied to final preview, not individual assets
      
      // Draw the centered square crop to output
      if (actualSrcW > 0 && actualSrcH > 0) {
        ctx.drawImage(
          imgEl,
          srcX0, srcY0, actualSrcW, actualSrcH,
          0, 0, outputSize, outputSize
        );
      }
      ctx.restore();
      
      const newAssetUrl = canvas.toDataURL('image/png');
      const newId = Date.now();

      setLayers([...layers, { 
          id: newId, 
          type: 'image', 
          src: newAssetUrl, 
          x: 500, 
          y: 500, 
          width: 300, 
          height: 300,
          aspectRatio: 1,
          rotation: 0 
      }]);
      setSelectedLayerId(newId);
      
      resetAssetModal();
  };

  const resetAssetModal = () => {
      setShowAssetModal(false); 
      setAssetSourceMode(null); 
      setTempAssetImage(null);
      setPreviewAssetUrl(null);
      setAssetProcessSettings({ enableLineArt: false, threshold: 10, thickness: 15, dither: false, invert: false, bgRemovalMethod: 'none' });
  };

  const finalizeDesign = () => {
      triggerHaptic();
      setWasInDesignMode(true);
      const canvas = document.createElement('canvas');
      canvas.width = 1000; canvas.height = 1000;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = "white"; 
      ctx.fillRect(0,0,1000,1000);
      
      layers.forEach(layer => {
        ctx.save();
        ctx.translate(layer.x, layer.y);
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);

        if(layer.type === 'text') {
            ctx.fillStyle = "black";
            ctx.textBaseline = "middle";
            ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
            ctx.textAlign = layer.textAlign || 'center';
            
            const lines = layer.text.split('\n');
            const lineHeight = layer.fontSize; 
            const totalHeight = lines.length * lineHeight;
            const startY = -(totalHeight / 2) + (lineHeight / 2);

            lines.forEach((line, i) => {
               ctx.fillText(line, 0, startY + (i * lineHeight));
            });

        } else if (layer.type === 'image') {
            const img = new Image();
            img.src = layer.src;
            ctx.drawImage(img, -layer.width/2, -layer.height/2, layer.width, layer.height);
        }
        ctx.restore();
      });
      
      setCapturedImage(canvas.toDataURL('image/png'));
      setShowDesignTool(false);
      setCropState({ x: 0, y: 0, zoom: 1 });
      setStep('crop');
  };

  const handleCropBack = () => {
      if (wasInDesignMode) {
          setStep('camera');
          setShowDesignTool(true);
      } else {
          setStep('camera');
          setShowDesignTool(false);
      }
  };

  const confirmMainCrop = () => {
      triggerHaptic();
      const imgEl = cropImgRef.current;
      const containerEl = imgEl ? imgEl.parentElement : null;
      if (!imgEl || !containerEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      const relativeX = containerRect.left - imgEl.getBoundingClientRect().left;
      const relativeY = containerRect.top - imgEl.getBoundingClientRect().top;
      const scaleX = imgEl.naturalWidth / imgEl.getBoundingClientRect().width;
      
      const outputSize = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize; canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, outputSize, outputSize);

        ctx.save();
        // apply flips (mirror) if requested
        if (settings.flipH || settings.flipV) {
          const tx = settings.flipH ? outputSize : 0;
          const ty = settings.flipV ? outputSize : 0;
          ctx.translate(tx, ty);
          ctx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
        }

        // apply circle mask if selected
        if (settings.maskShape === 'circle') {
          ctx.beginPath();
          ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
          ctx.clip();
        }

        ctx.drawImage(imgEl, Math.max(0, relativeX * scaleX), Math.max(0, relativeY * scaleX), containerRect.width * scaleX, containerRect.height * scaleX, 0, 0, outputSize, outputSize);
        ctx.restore();
      const finalImage = canvas.toDataURL('image/png');
      
      setOriginalImage(finalImage); 
      setStep('preview');
  };

  useEffect(() => {
      if (countdown === null) return;
      if (countdown > 0) {
          const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
          return () => clearTimeout(timer);
      } else {
          setCountdown(null);
          executeEngraving();
      }
  }, [countdown]);

  const initiateEngrave = () => {
      triggerHaptic();
      if (!isConnected) { showToast("No machine connected"); return; }
      if (!isEngravingUnlocked) { showToast("Please confirm wood placement"); return; }
      setCountdown(3);
  };

  const calculateEstimatedTime = (gcodeLines) => {
    let timeSeconds = 0; let currentX = 0, currentY = 0; let currentSpeed = settings.speed;
    gcodeLines.forEach(line => {
      let newX = currentX; let newY = currentY; let isMove = false;
      const parts = line.split(' ');
      parts.forEach(part => {
        if (part.startsWith('X')) { newX = parseFloat(part.substring(1)); isMove = true; }
        if (part.startsWith('Y')) { newY = parseFloat(part.substring(1)); isMove = true; }
        if (part.startsWith('F')) { currentSpeed = parseFloat(part.substring(1)); }
      });
      if (isMove && (line.startsWith('G0') || line.startsWith('G1'))) {
        const dist = Math.sqrt(Math.pow(newX - currentX, 2) + Math.pow(newY - currentY, 2));
        const speedSec = (line.startsWith('G0') ? 6000 : currentSpeed) / 60;
        if (speedSec > 0) timeSeconds += dist / speedSec;
        currentX = newX; currentY = newY;
      }
    });
    const mins = Math.floor(timeSeconds / 60); const secs = Math.floor(timeSeconds % 60);
    return `${mins}m ${secs}s`;
  };

  const loadBodyPix = async () => { 
    if (bodyPixModelRef.current) return bodyPixModelRef.current;
    if (!window.bodyPix || !window.tf) { await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js'); await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.0.5/dist/body-pix.min.js'); }
    const waitFor = (name) => new Promise(res => { const i = setInterval(() => { if(window[name]) { clearInterval(i); res(window[name]); }}, 50); });
    await waitFor('bodyPix');
    const model = await window.bodyPix.load({ architecture: 'MobileNetV1', outputStride: 16, multiplier: 0.75, quantBytes: 2 });
    bodyPixModelRef.current = model;
    return model;
  };

  const processBackgroundRemoval = async () => { 
    if (!originalImage) return;
    setStatusText('Processing...');
    try {
      let currentImg = originalImage;
      if (settings.bgRemovalMethod === 'local') {
        setStatusText('AI Removing Background...');
        const model = await loadBodyPix();
        const img = new Image(); img.crossOrigin = 'anonymous';
        await new Promise(res => { img.onload = res; img.src = currentImg; });
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        const segmentation = await model.segmentPerson(canvas, { internalResolution: 'medium', segmentationThreshold: 0.7 });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) { if (segmentation.data[i / 4] !== 1) imageData.data[i + 3] = 0; }
        ctx.putImageData(imageData, 0, 0);
        currentImg = canvas.toDataURL('image/png');
      } else if (settings.bgRemovalMethod === 'cloud') {
        setStatusText('Uploading...');
        const resBlob = await fetch(currentImg); const blob = await resBlob.blob();
        const formData = new FormData(); formData.append("file", blob); formData.append("upload_preset", UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if(data.error) throw new Error(data.error.message);
        currentImg = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/e_background_removal/${data.public_id}.png`;
      }
      setOriginalImage(currentImg); 
      setStatusText('Applying Effects...');
      setTimeout(() => { if (step === 'preview') generatePreview(); setStatusText('Ready'); }, 500);
    } catch (err) { console.error(err); showToast('Error: ' + err.message); }
  };

  const generatePreview = () => {
    const canvas = previewCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => {
      const pixelsPerMm = settings.linesPerMm;
      const resolution = Math.floor(settings.size * pixelsPerMm);
      const width = resolution; const height = resolution;
      canvas.width = resolution; canvas.height = resolution;
      
      // --- MASKING LOGIC START ---
      // 1. Fill entire background with WHITE (Laser Power 0)
      ctx.fillStyle = '#FFFFFF'; 
      ctx.fillRect(0, 0, resolution, resolution);
      
        // 2. Apply transforms (flip) and Clipping Mask (Circle/Square) if selected
        ctx.save();
        // apply flips (mirror) for preview
        if (settings.flipH || settings.flipV) {
          const tx = settings.flipH ? resolution : 0;
          const ty = settings.flipV ? resolution : 0;
          ctx.translate(tx, ty);
          ctx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);
        }

        // apply circle mask (square removed)
        if (settings.maskShape === 'circle') {
          ctx.beginPath();
          ctx.arc(resolution / 2, resolution / 2, resolution / 2, 0, Math.PI * 2);
          ctx.clip(); // Restricts drawing to circle
        }

        // --- MASKING LOGIC END ---

        ctx.drawImage(img, 0, 0, resolution, resolution);

        ctx.restore(); // Restore context to remove clip/transform for subsequent filters

      const imageData = ctx.getImageData(0, 0, resolution, resolution);
      const data = imageData.data;
      let gray = new Float32Array(width * height);
      for (let i = 0; i < data.length; i += 4) gray[i/4] = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
      
      if (settings.enableLineArt) {
         gray = applyBoxBlur(gray, width, height, settings.sketchParams.smoothness);
         const integral = computeIntegralImage(gray, width, height);
         const radius = Math.max(2, Math.floor(width * (settings.sketchParams.thickness / 1000)));
         const thresholdPercent = 1.0 - (settings.sketchParams.threshold / 100);
         const outputBuffer = new Uint8ClampedArray(width * height);
         for (let y = 0; y < height; y++) {
             for (let x = 0; x < width; x++) {
                 const idx = y * width + x;
                 const x1 = x - radius; const y1 = y - radius;
                 const x2 = x + radius; const y2 = y + radius;
                 const area = (Math.min(width - 1, x2) - Math.max(0, x1) + 1) * (Math.min(height - 1, y2) - Math.max(0, y1) + 1);
                 const localAvg = getRectSum(integral, width, height, x1, y1, x2, y2) / area;
                 outputBuffer[idx] = (gray[idx] < (localAvg * thresholdPercent)) ? 0 : 255;
             }
         }
         for(let i=0; i<gray.length; i++) gray[i] = outputBuffer[i];
      }
      if (settings.dither) applyDithering(gray, width, height);
      for (let i = 0; i < data.length; i += 4) {
          let val = gray[i/4];
          let outputVal = settings.invert ? val : (255 - val);
          outputVal = Math.max(0, Math.min(255, outputVal));
          let displayVal = 255 - outputVal;
          data[i] = displayVal; data[i+1] = displayVal; data[i+2] = displayVal; data[i+3] = 255;
      }
      setProcessedData({ data: imageData.data, width, height });
      ctx.putImageData(imageData, 0, 0);
      generateGcodeAndCalcTime({ data: imageData.data, width, height }, settings);
    };
    img.src = originalImage; 
  };

  const updateSetting = (key, val) => setSettings(prev => ({...prev, [key]: val}));
  const updateSketchParam = (paramKey, val) => setSettings(prev => ({ ...prev, sketchParams: { ...prev.sketchParams, [paramKey]: val } }));
  const applyPreset = (presetKey) => {
    const preset = MACHINE_PRESETS[presetKey];
    if (preset) { setSettings(prev => ({ ...prev, size: preset.size, bedWidth: preset.bedWidth, bedHeight: preset.bedHeight })); setCurrentPresetName(presetKey); }
  };

  // --- MACHINE COMMANDS ---
  const handleJog = (x, y) => { window.electron?.sendGcode(`G91\nG0 X${x} Y${y} F3000\nG90`); };
   
  const handleToggleAlignment = async () => {
    if (!isConnected) { showToast("No machine"); return; }
    const centerOffset = (settings.size / 2).toFixed(2);
    const alignS = Math.max(1, Math.floor(settings.alignPower * 10));
    
    let commands = [];
    if (!isAligned) {
      commands = ['G21','G90','G92 X0 Y0',`G1 X-${centerOffset} Y${centerOffset} F2000`,`M3 S${alignS}`];
      setIsAligned(true);
    } else {
      commands = ['M5 S0','G1 X0 Y0 F2000'];
      setIsAligned(false);
    }

    if (activeConnectionType === 'wifi') {
      await sendCommandsWithDelay(commands);
    } else {
      commands.forEach(c => window.electron?.sendGcode(c));
    }
  };

  const handleFrame = async () => {
    if (!isConnected) { showToast("No machine"); return; }
    
    if(isAligned) { 
        window.electron?.sendGcode('M5 S0'); 
        window.electron?.sendGcode('G0 X0 Y0 F2000'); 
        setIsAligned(false); 
    }
    
    const s = settings.size; const p = Math.max(1, Math.floor(settings.alignPower * 10));
    const commands = ['G21','G90','G92 X0 Y0',`M3 S${p}`,`G1 X-${s} Y0 F2000`,`G1 X-${s} Y${s} F2000`,`G1 X0 Y${s} F2000`,`G1 X0 Y0 F2000`,'M5 S0'];

    if (activeConnectionType === 'wifi') {
      await sendCommandsWithDelay(commands);
    } else {
      commands.forEach(c => window.electron?.sendGcode(c));
    }
  };

  const generateGcodeAndCalcTime = (pData, currSettings) => {
    const { data, width, height } = pData;
    const scale = currSettings.size / width; const maxS = currSettings.power * 10;
    const gcode = ['G21', 'G90', 'M4 S0', `G1 F${currSettings.speed}`];
    for (let y = 0; y < height; y++) {
      let rowSegments = []; let inSegment = false; let startX = -1;
      for (let x = 0; x < width; x++) {
        let idx = (y * width + x) * 4; let pixelVal = data[idx]; let power = Math.floor(((255 - pixelVal) / 255) * maxS);
        if (power > 0 && !inSegment) { inSegment = true; startX = x; }
        else if (power <= 0 && inSegment) { inSegment = false; rowSegments.push({ start: startX, end: x - 1 }); }
      }
      if (inSegment) rowSegments.push({ start: startX, end: width - 1 });
      if (rowSegments.length === 0) continue;
      const yPos = (y * scale).toFixed(3); const isReverse = y % 2 !== 0; if (isReverse) rowSegments.reverse();
      for (let i = 0; i < rowSegments.length; i++) {
        let seg = rowSegments[i]; let entryX = isReverse ? seg.end : seg.start; let exitX = isReverse ? seg.start : seg.end;
        gcode.push(`G0 X-${(entryX * scale).toFixed(3)} Y${yPos}`);
        let step = isReverse ? -1 : 1; let currentPower = -1;
        for (let x = entryX; x !== exitX + step; x += step) {
             let idx = (y * width + x) * 4; let pixelVal = data[idx]; let power = Math.floor(((255 - pixelVal) / 255) * maxS);
             if (power !== currentPower) { if (currentPower !== -1) gcode.push(`G1 X-${(x * scale).toFixed(3)} S${currentPower}`); currentPower = power; }
        }
        gcode.push(`G1 X-${(exitX * scale).toFixed(3)} S${currentPower > 0 ? currentPower : 0}`);
      }
    }
    gcode.push('M5'); gcode.push('G0 X0 Y0');
    gcodeQueueRef.current = gcode;
    setEstimatedTime(calculateEstimatedTime(gcode));
  };

  const executeEngraving = () => {
    if (isAligned) { window.electron?.sendGcode('M5 S0'); window.electron?.sendGcode('G1 X0 Y0 F500'); setIsAligned(false); }
    currentLineRef.current = 0; stopRef.current = false; pausedRef.current = false; setIsPaused(false);
    setStep('engraving'); setProgress(0); setStatusText('Starting...'); sendNextLine();
  };

  const sendNextLine = async () => {
    if (stopRef.current || pausedRef.current) return;
    const idx = currentLineRef.current;
    if (idx >= gcodeQueueRef.current.length) { 
        setStep('finished'); 
        // --- UPDATE 4: SAVE TRANSACTION ON FINISH ---
        saveTransaction();
        return; 
    }
    
    const line = gcodeQueueRef.current[idx];
    const delayMs = activeConnectionType === 'wifi' ? 50 : 0; 
    
    window.electron?.sendGcode(line);
    
    if (delayMs > 0) {
        await delay(delayMs);
    }
    
    setProgress((idx / gcodeQueueRef.current.length) * 100); currentLineRef.current++;
  };

  const getCurrentStepNum = () => {
      switch(step) {
          case 'camera': return 1;
          case 'crop': return 1;
          case 'preview': return 2;
          case 'alignment': case 'engraving': case 'finished': return 3;
          default: return 1;
      }
  };

  const handleStepClick = (num) => {
      const current = getCurrentStepNum();
      if (num >= current) return;
      if (num === 1) setStep('camera');
      else if (num === 2) { if (originalImage) setStep('preview'); else setStep('camera'); }
  };

  const renderBottomButtons = () => {
      return (
          <div style={styles.bottomBar}>
              {step === 'camera' && !showDesignTool && (
                <>
                  <div style={{display: 'none'}}><input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files[0]; if (file) { setWasInDesignMode(false); const reader = new FileReader(); reader.onload = (ev) => { setCapturedImage(ev.target.result); setCropState({ x: 0, y: 0, zoom: 1 }); const img = new Image(); img.onload = () => setStep('crop'); img.src = ev.target.result; }; reader.readAsDataURL(file); } }} accept="image/*" /></div>
                  <div style={{display: 'flex', gap: '10px', width: '100%'}}>
                      <button className="anim-btn" style={{...styles.bigActionBtn, flex: 1}} onClick={() => fileInputRef.current.click()}>UPLOAD</button>
                      <button className="anim-btn" style={{...styles.bigActionBtn, flex: 1}} onClick={() => { setShowDesignTool(true); setIsDragging(false); }}>DESIGN</button>
                  </div>
                  <button className="anim-btn" style={styles.primaryActionBtn} onClick={handleMainCapture}>CAPTURE</button>
                </>
              )}
              {showDesignTool && (
                  <>
                    <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex:1}} onClick={() => {setShowDesignTool(false); setWasInDesignMode(false);}}>CANCEL</button>
                    <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex:1}} onClick={finalizeDesign}>USE THIS</button>
                  </>
              )}
              {step === 'crop' && (
                <>
                  <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex: 1}} onClick={handleCropBack}>BACK</button>
                  <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex: 1}} onClick={confirmMainCrop}>CONFIRM</button>
                </>
              )}
              {step === 'alignment' && (
                <>
                  <div style={{display:'flex', gap:'5px', flex: 1}}>
                      <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex: 1, padding:'12px 5px'}} onClick={handleFrame}>FRAME</button>
                      <button className="anim-btn" style={{...styles.button, ...(isAligned ? styles.btnSecondary : styles.btnWarning), flex: 1, padding:'12px 5px'}} onClick={handleToggleAlignment}>{isAligned ? "RESET" : "AIM"}</button>
                  </div>
                  <button className="anim-btn" style={{...styles.button, ...(isEngravingUnlocked ? styles.btnPrimary : {background:'#ccc', cursor:'not-allowed'}), flex: 1}} onClick={initiateEngrave} disabled={!isEngravingUnlocked}>START</button>
                  <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex: 1}} onClick={() => setStep('preview')}>BACK</button>
                </>
              )}
              {step === 'preview' && (
                 <>
                   <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex: 1}} onClick={() => setStep('crop')}>BACK</button>
                   <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex: 1}} onClick={downloadImage}>SAVE</button>
                   <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex: 1}} onClick={() => setStep('alignment')}>NEXT</button>
                 </>
              )}
              {step === 'engraving' && (
                <>
                  {!isPaused ? 
                      <button className="anim-btn" style={{...styles.button, ...styles.btnWarning, flex: 1}} onClick={() => { pausedRef.current = true; setIsPaused(true); window.electron?.sendGcode('M5'); }}>PAUSE</button> :
                      <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex: 1}} onClick={() => { pausedRef.current = false; setIsPaused(false); window.electron?.sendGcode('M4 S0'); sendNextLine(); }}>RESUME</button>
                  }
                  <button className="anim-btn" style={{...styles.button, ...styles.btnDanger, flex: 1}} onClick={() => { stopRef.current = true; window.electron?.sendGcode('M5'); window.electron?.sendGcode('G0 X0 Y0'); setStep('camera'); }}>STOP</button>
                </>
              )}
              {step === 'finished' && <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, width: '100%'}} onClick={() => window.location.reload()}>NEW JOB</button>}
          </div>
      );
  };

  const renderStepper = () => {
      const current = getCurrentStepNum();
      return (
          <div style={isMobile ? styles.stepperMobile : styles.stepperDesktop}>
              {[1, 2, 3].map(num => (
                  <div key={num} onClick={() => handleStepClick(num)}
                    style={{ ...styles.stepBubble, backgroundColor: num <= current ? theme.subText : theme.accent, color: num <= current ? theme.bg : theme.subText, cursor: num < current ? 'pointer' : 'default', opacity: num > current ? 0.5 : 1 }}>
                      {num}
                  </div>
              ))}
          </div>
      );
  };

  const styles = {
    container: { fontFamily: '"Inter", sans-serif', width: '100%', maxWidth: '100vw', height: '100vh', boxSizing: 'border-box', backgroundColor: theme.bg, display: 'flex', justifyContent: 'center', padding: '10px', overflow: 'hidden', position: 'relative' },
    toast: { position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#3E2723', color: '#fff', padding: '12px 24px', borderRadius: '30px', zIndex: 3000, animation: 'toastFadeIn 0.3s ease-out forwards', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 'bold' },
    countdownOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 5000, animation: 'popIn 0.5s' },
    countdownNumber: { fontSize: '10rem', color: '#fff', fontWeight: 'bold', fontFamily: 'sans-serif' },
    statusPopup: { position: 'absolute', top: '5px', right: '5px', background: theme.card, padding: '5px 15px', borderRadius: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '5px', zIndex: 200, border: `1px solid ${theme.accent}` },
    darkModeToggle: { position: 'absolute', top: '5px', left: '5px', background: theme.card, padding: '5px 10px', borderRadius: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '5px', zIndex: 200, border: `1px solid ${theme.accent}`, cursor: 'pointer', fontSize:'1.2rem' },
    historyBtn: { position: 'absolute', top: '5px', left: '60px', background: theme.card, padding: '5px 10px', borderRadius: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '5px', zIndex: 200, border: `1px solid ${theme.accent}`, cursor: 'pointer', fontSize:'0.9rem', fontWeight: 'bold' },
    statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
    stepperDesktop: { display: 'flex', gap: '20px', marginBottom: '20px', background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '30px' },
    stepperMobile: { display: 'flex', flexDirection: 'row', gap: '20px', justifyContent: 'center', width: '100%' },
    stepBubble: { width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
    card: { background: theme.card, borderRadius: '24px', padding: '10px', boxShadow: isDarkMode ? '0 25px 60px rgba(0,0,0, 0.5)' : '0 25px 60px rgba(93, 64, 55, 0.2)', border: `1px solid ${theme.accent}`, width: '100%', maxWidth: '1100px', display: 'flex', gap: '20px', alignItems: 'center', marginLeft: '0', position: 'relative' },
    frameContainer: { backgroundColor: theme.frame, borderRadius: '16px', overflow: 'hidden', border: `4px solid ${theme.frameBorder}`, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' },
    video: { width: '100%', height: '100%', objectFit: 'cover' },
    canvas: { width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' },
    controlsPanel: { flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowX: 'hidden' },
    logoHeader: { width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    panelLogo: { height: '100px', width: 'auto', maxWidth: '100%', objectFit: 'contain', filter: isDarkMode ? 'brightness(0.8) contrast(1.2)' : 'none' },
    contentArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', flexShrink: 0 },
    title: { fontSize: '1.8rem', color: theme.text, marginTop: '5px', marginBottom: '5px', fontFamily: 'Georgia, serif', lineHeight: '1', textAlign: 'center' },
    subtitle: { color: theme.subText, fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '10px' },
    buttonGroup: { width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', flexWrap: 'wrap' },
    captureGroup: { display: 'flex', gap: '10px', width: '100%', marginBottom: '20px', flexWrap: 'wrap' },
    button: { padding: '12px', fontSize: '1rem', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontFamily: 'Georgia, serif', textTransform: 'uppercase', letterSpacing: '1.5px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', minWidth: '100px' },
    btnPrimary: { background: 'linear-gradient(to bottom, #795548, #5D4037)', color: 'white', boxShadow: '0 4px 0 #3E2723' },
    btnSecondary: { background: theme.buttonSec, color: theme.buttonText, border: `1px solid ${theme.accent}` },
    btnWarning: { background: '#FFB74D', color: '#5D4037', boxShadow: '0 4px 0 #F57C00' },
    btnDanger: { background: '#E57373', color: 'white', boxShadow: '0 4px 0 #C62828' },
    progressBarContainer: { width: '100%', height: '16px', backgroundColor: theme.accent, borderRadius: '10px', overflow: 'hidden', marginBottom: '15px', border: `1px solid ${theme.accent}` },
    progressBarFill: { height: '100%', backgroundColor: '#2E7D32', transition: 'width 0.2s ease' },
    settingsGroup: { width: '90%', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', background: isDarkMode ? '#424242' : '#F5F5F5', padding: '15px', borderRadius: '10px' },
    subSettingsGroup: { background: isDarkMode ? '#5D4037' : '#FFF3E0', padding: '10px', borderRadius: '0 0 8px 8px', border: '1px solid #FFE0B2', borderTop: 'none', marginTop: '-5px', marginBottom: '10px' },
    infoBox: { background: isDarkMode ? '#01579B' : '#E1F5FE', padding: '10px', borderRadius: '8px', border: '1px solid #81D4FA', marginBottom: '10px' },
    label: { fontSize: '0.8rem', fontWeight: 'bold', color: theme.text, display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
    infoLabel: { fontSize: '0.8rem', fontWeight: 'bold', color: isDarkMode ? '#81D4FA' : '#0277BD', marginBottom: '5px', display: 'block' },
    select: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #0288D1', background: isDarkMode ? '#616161' : 'white', color: isDarkMode ? 'white' : 'black' },
    checkboxContainer: { fontSize: '0.85rem', fontWeight: 'bold', color: theme.text, display: 'flex', justifyContent: 'flex-start', gap: '10px', cursor: 'pointer', background: isDarkMode ? '#5D4037' : '#FFF3E0', padding: '10px', borderRadius: '8px', border: '1px solid #FFE0B2', marginBottom: '0' },
    checkboxLabel: { fontSize: '0.85rem', fontWeight: 'bold', color: theme.text, display: 'flex', justifyContent: 'flex-start', gap: '10px', cursor: 'pointer' },
    slider: { width: '100%', cursor: 'pointer' },
    lockContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#FFEBEE', padding: '10px', borderRadius: '8px', border: '1px solid #EF9A9A', width: '100%', boxSizing: 'border-box' },
    lockText: { color: '#C62828', fontWeight: 'bold', fontSize: '0.9rem' },
    engraveImage: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
    engraveOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.7)', transition: 'clip-path 0.1s linear' },
    laserLine: { position: 'absolute', left: 0, right: 0, height: '2px', backgroundColor: '#FF5252', boxShadow: '0 0 8px #FF5252', transition: 'top 0.1s linear', zIndex: 10 },
    presetSelectorContainer: { width: '100%', marginBottom: '15px' },
    jogContainer: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', width: '90%', maxWidth: '300px', aspectRatio: '1/1', padding: '20px' },
    jogBtn: { background: theme.buttonSec, color: theme.text, border: `1px solid ${theme.accent}`, borderRadius: '8px', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
    bottomBar: { width: '100%', padding: '15px', background: theme.card, borderTop: `1px solid ${theme.accent}`, display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto', flexShrink: 0 }, 
    bigActionBtn: { background: '#EFEBE9', color: '#5D4037', border: '2px solid #D7CCC8', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', padding: '15px', cursor: 'pointer', boxShadow: '0 4px 0 #D7CCC8' },
    primaryActionBtn: { background: 'linear-gradient(to bottom, #795548, #5D4037)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.3rem', padding: '18px', cursor: 'pointer', boxShadow: '0 4px 0 #3E2723', width: '100%' },
    modalOverlay: { position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.8)', zIndex: 4000, display:'flex', justifyContent:'center', alignItems:'center' },
    modalContent: { background: theme.card, padding:'20px', borderRadius:'16px', width:'90%', maxWidth:'480px', maxHeight:'90vh', display:'flex', flexDirection:'column', gap:'15px', alignItems:'center', boxSizing: 'border-box', overflowY: 'auto' },
    designWorkspace: { width:'100%', height:'100%', position:'relative', background:'#ffffff', overflow:'hidden', containerType: 'size' }
  };

  return (
    <div style={{ ...styles.container, flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'flex-start' : 'center' }}>
      
      {/* STATUS & OVERLAYS */}
      <div style={styles.statusPopup}>
        <div style={{ ...styles.statusDot, backgroundColor: isConnected ? '#4CAF50' : '#F44336' }}/>
        <span style={{fontSize: '0.8rem', fontWeight: 'bold', color: theme.text}}>{isConnected ? "ON" : "OFF"}</span>
      </div>
      <div style={styles.darkModeToggle} onClick={() => setIsDarkMode(!isDarkMode)}><span>{isDarkMode ? "🌙" : "☀️"}</span></div>
      
      {/* --- HARDWARE SETTINGS BUTTON --- */}
      <div style={{...styles.historyBtn, left: '130px'}} onClick={() => setShowHardwareSettings(true)}><span>⚙️ Hardware</span></div>
      
      {/* --- UPDATE 5: HISTORY BUTTON --- */}
      <div style={styles.historyBtn} onClick={() => setShowHistory(true)}><span>📜 History</span></div>

      {countdown !== null && <div style={styles.countdownOverlay}><div style={styles.countdownNumber}>{countdown}</div><div style={{color:'white', fontSize:'1.5rem'}}>Starting Laser...</div></div>}
      
      {/* --- UPDATE 6: HISTORY MODAL --- */}
      {showHistory && (
          <div style={styles.modalOverlay}>
              <div style={styles.modalContent}>
                  <div style={{display:'flex', justifyContent:'space-between', width:'100%', alignItems:'center'}}>
                      <h3 style={styles.title}>Transaction Logs</h3>
                      <button style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:theme.text}} onClick={() => setShowHistory(false)}>×</button>
                  </div>
                  <div style={{width:'100%', overflowX:'auto'}}>
                    {transactions.length === 0 ? <p style={{color: theme.text}}>No logs yet.</p> : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Size</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => (
                                    <tr key={t.id}>
                                        <td>{t.date.split(',')[0]}</td>
                                        <td>{t.preset}</td>
                                        <td>{t.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                  </div>
                  <button className="anim-btn" style={{...styles.button, ...styles.btnDanger, width:'100%'}} onClick={clearHistory}>CLEAR LOGS</button>
              </div>
          </div>
      )}

      {/* --- HARDWARE SETTINGS MODAL --- */}
      {showHardwareSettings && (
          <div style={styles.modalOverlay}>
              <div style={styles.modalContent}>
                  <div style={{display:'flex', justifyContent:'space-between', width:'100%', alignItems:'center', marginBottom:'20px'}}>
                      <h3 style={styles.title}>Hardware Configuration</h3>
                      <button style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:theme.text}} onClick={() => setShowHardwareSettings(false)}>×</button>
                  </div>

                  {/* HARDWARE PROFILE SELECTION */}
                  <div style={{width:'100%', marginBottom:'20px'}}>
                      <label style={{...styles.label, display:'block', marginBottom:'10px', fontWeight:'bold'}}>Select Hardware Board:</label>
                      <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                          {hardwareProfiles.map(profile => (
                              <button
                                  key={profile.id}
                                  className="anim-btn"
                                  style={{
                                      ...styles.button,
                                      ...(selectedHardware === profile.id ? styles.btnPrimary : styles.btnSecondary),
                                      padding:'12px',
                                      textAlign:'left',
                                      border: selectedHardware === profile.id ? `2px solid ${theme.accent}` : `1px solid ${theme.accent}`
                                  }}
                                  onClick={() => handleHardwareChange(profile.id)}
                              >
                                  <div style={{fontWeight:'bold'}}>{profile.name}</div>
                                  <div style={{fontSize:'0.8rem', opacity:0.7}}>Baud: {profile.defaultBaudRate} | Default: {profile.baudRates.join(', ')}</div>
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* BAUD RATE SELECTION */}
                  <div style={{width:'100%', marginBottom:'20px'}}>
                      <label style={{...styles.label, display:'block', marginBottom:'10px', fontWeight:'bold'}}>Baud Rate:</label>
                      <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                          {availableBaudRates.map(baudRate => (
                              <button
                                  key={baudRate}
                                  className="anim-btn"
                                  style={{
                                      ...styles.button,
                                      ...(selectedBaudRate === baudRate ? styles.btnPrimary : styles.btnSecondary),
                                      padding:'8px 16px',
                                      flex: '0 1 auto'
                                  }}
                                  onClick={() => handleBaudRateChange(baudRate)}
                              >
                                  {baudRate}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* CURRENT CONFIGURATION DISPLAY */}
                  <div style={{...styles.infoBox, width:'100%', marginBottom:'20px'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                          <span style={{fontWeight:'bold', color:theme.text}}>Current Configuration:</span>
                      </div>
                      <div style={{fontSize:'0.9rem', color:theme.subText, lineHeight:'1.6'}}>
                          <div><b>Hardware:</b> {hardwareProfiles.find(p => p.id === selectedHardware)?.name || 'Unknown'}</div>
                          <div><b>Baud Rate:</b> {selectedBaudRate} bps</div>
                          <div><b>Connection Type:</b> USB (Serial)</div>
                          <div><b>Status:</b> {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
                      </div>
                  </div>

                  {/* INFO BOX */}
                  <div style={{...styles.infoBox, width:'100%', backgroundColor: theme.buttonSec, borderLeft:`4px solid ${theme.guideColor}`}}>
                      <p style={{fontSize:'0.85rem', color:theme.text, margin:'0'}}>
                          <b>📖 Tips:</b><br/>
                          - <b>Arduino Uno:</b> Use 9600 baud rate (slower processor)<br/>
                          - <b>Arduino Mega:</b> Use 115200 baud rate (more memory)<br/>
                          - <b>ESP32:</b> Supports WiFi + USB at 115200<br/>
                          - Change hardware before connecting to the machine
                      </p>
                  </div>

                  <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, width:'100%', marginTop:'15px'}} onClick={() => setShowHardwareSettings(false)}>CLOSE</button>
              </div>
          </div>
      )}

      {/* ASSET ADDITION MODAL */}
      {showAssetModal && (
          <div style={styles.modalOverlay}>
              <div style={styles.modalContent}>
                  <h3 style={styles.title}>Add Picture</h3>
                  {!assetSourceMode ? (
                      <div style={{display:'flex', gap:'10px', width:'100%', flexWrap: 'wrap'}}>
                          <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex:1, minWidth: '60px'}} onClick={() => setAssetSourceMode('camera')}>📷 Capture</button>
                          <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex:1, minWidth: '60px'}} onClick={() => assetFileInputRef.current.click()}>📁 Upload</button>
                          <input type="file" ref={assetFileInputRef} onChange={(e) => {
                              const file = e.target.files[0];
                              if(file) { const r = new FileReader(); r.onload=(ev)=>{ setTempAssetImage(ev.target.result); setAssetSourceMode('crop'); }; r.readAsDataURL(file); }
                          }} style={{display:'none'}} accept="image/*" />
                      </div>
                  ) : assetSourceMode === 'camera' ? (
                      <div style={{position:'relative', width:'100%', aspectRatio:'1/1', background:'black', borderRadius:'8px', overflow:'hidden'}}>
                          <video ref={assetVideoRef} autoPlay muted playsInline style={{width:'100%', height:'100%', objectFit:'cover'}} />
                          <button className="anim-btn" style={{position:'absolute', bottom:'10px', left:'50%', transform:'translateX(-50%)', ...styles.btnPrimary}} onClick={handleAssetCapture}>SNAP</button>
                      </div>
                  ) : (
                      <div style={{width:'100%', aspectRatio:'1/1', position:'relative', background:'black', overflow:'hidden', borderRadius:'8px'}}>
                          <img ref={assetCropRef} src={previewAssetUrl || tempAssetImage} alt="Crop" style={{position:'absolute', top:'50%', left:'50%', transform: `translate(-50%, -50%) translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.zoom})`, width:'100%', height:'100%', objectFit:'contain', cursor:'move'}} 
                               onMouseDown={(e)=>{e.preventDefault(); const startX=e.clientX; const startY=e.clientY; const startPX=cropState.x; const startPY=cropState.y; const onMove=(em)=>{setCropState(prev=>({...prev,x:startPX+(em.clientX-startX),y:startPY+(em.clientY-startY)}))}; const onUp=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}; window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);}} 
                          />
                          <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'2px solid white', pointerEvents:'none'}}/>
                          <input type="range" min="1" max="3" step="0.1" value={cropState.zoom} onChange={(e)=>setCropState(p=>({...p, zoom:parseFloat(e.target.value)}))} style={{position:'absolute', bottom:'5px', left:'10%', width:'80%'}} />
                      </div>
                  )}
                  
                  {assetSourceMode === 'crop' && (
                    <div style={{width:'100%', background: theme.buttonSec, padding:'10px', borderRadius:'8px', boxSizing:'border-box', maxHeight:'200px', overflowY:'auto'}}>
                        <div style={{...styles.infoBox, marginBottom: '10px', padding: '5px 10px'}}>
                            <label style={styles.infoLabel}>Remove Background:</label>
                            <div style={{display:'flex', gap:'5px', alignItems: 'center'}}>
                                <select value={assetProcessSettings.bgRemovalMethod} onChange={(e) => setAssetProcessSettings(p => ({...p, bgRemovalMethod: e.target.value}))} style={{...styles.select, flex: 2, padding: '5px'}}>
                                    <option value="none">None</option>
                                    <option value="local">Local AI (Free)</option>
                                    <option value="cloud">Cloud AI (Best)</option>
                                </select>
                                <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex: 1, padding: '5px', fontSize: '0.8rem', minWidth: '40px'}} onClick={processAssetBackgroundRemoval} disabled={isProcessingAsset || assetProcessSettings.bgRemovalMethod === 'none'}>
                                    {isProcessingAsset ? '...' : 'PROC'}
                                </button>
                            </div>
                        </div>
                        <label style={styles.checkboxContainer}>
                           <input type="checkbox" checked={assetProcessSettings.enableLineArt} onChange={(e) => setAssetProcessSettings(p => ({...p, enableLineArt: e.target.checked}))} style={{transform: 'scale(1.2)'}} />
                           <span style={{color: '#E65100', fontSize: '0.9rem'}}>Enable Stencil / Line Art</span>
                        </label>
                        {assetProcessSettings.enableLineArt && (
                          <div style={{marginTop:'5px', paddingLeft:'10px'}}>
                             <label style={styles.label}>Sensitivity</label>
                             <input type="range" min="1" max="20" step="0.5" value={assetProcessSettings.threshold} onChange={(e) => setAssetProcessSettings(p => ({...p, threshold: parseFloat(e.target.value)}))} style={styles.slider} />
                             <label style={styles.label}>Thickness</label>
                             <input type="range" min="5" max="50" step="1" value={assetProcessSettings.thickness} onChange={(e) => setAssetProcessSettings(p => ({...p, thickness: parseInt(e.target.value)}))} style={styles.slider} />
                          </div>
                        )}
                        <div style={{display:'flex', gap:'15px', marginTop:'5px'}}>
                           <label style={{...styles.checkboxLabel, fontSize:'0.8rem'}}><input type="checkbox" checked={assetProcessSettings.dither} onChange={(e) => setAssetProcessSettings(p => ({...p, dither: e.target.checked}))} /> Dither</label>
                           <label style={{...styles.checkboxLabel, fontSize:'0.8rem'}}><input type="checkbox" checked={assetProcessSettings.invert} onChange={(e) => setAssetProcessSettings(p => ({...p, invert: e.target.checked}))} /> Invert</label>
                        </div>
                    </div>
                  )}

                  <div style={{display:'flex', gap:'10px', width:'100%', marginTop:'10px', flexWrap: 'wrap'}}>
                      <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex:1, minWidth: '60px'}} onClick={() => { setShowAssetModal(false); setAssetSourceMode(null); setTempAssetImage(null); }}>Cancel</button>
                      {assetSourceMode === 'crop' && <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex:1, minWidth: '60px'}} onClick={confirmAssetCrop}>Add</button>}
                  </div>
              </div>
          </div>
      )}

      {/* DESKTOP STEPPER */}
      {!isMobile && renderStepper()}
      
      <div style={{ ...styles.card, flexDirection: isMobile ? 'column' : 'row', height: isMobile ? '100%' : 'auto', maxHeight: isMobile ? 'none' : '90vh', aspectRatio: isMobile ? 'auto' : '16/9', overflowY: 'hidden', flex: 1 }}>
        {toast.show && <div style={styles.toast}>{toast.message}</div>}

        {/* LEFT: WORKSPACE */}
        <div style={{ ...styles.frameContainer, width: isMobile ? '100%' : 'auto', height: isMobile ? 'auto' : '100%', aspectRatio: '1/1', flexShrink: 0 }}>
          {step === 'camera' && !showDesignTool && <video ref={videoRef} autoPlay muted playsInline style={styles.video} />}
          
          {/* --- DESIGN TOOL WORKSPACE --- */}
          {showDesignTool && (
              <div ref={designContainerRef} style={styles.designWorkspace}>
                  {guides.x && <div className="guide-v"></div>}
                  {guides.y && <div className="guide-h"></div>}
                  {layers.map(layer => (
                      <div key={layer.id}
                           onMouseDown={(e) => handleDragStart(e, layer.id)}
                           onTouchStart={(e) => handleDragStart(e, layer.id)}
                           className={`layer-item ${selectedLayerId === layer.id ? 'selected' : ''}`}
                           style={{
                               zIndex: 10, 
                               left: `${layer.x / 10}%`, 
                               top: `${layer.y / 10}%`,
                               transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg)`,
                               fontSize: layer.type==='text' ? `${layer.fontSize / 10}cqw` : undefined,
                               fontFamily: layer.fontFamily,
                               fontWeight: layer.fontWeight,
                               fontStyle: layer.fontStyle,
                               textAlign: layer.textAlign,
                               color: 'black', 
                               width: layer.type==='image' ? `${layer.width / 10}%` : undefined,
                               height: layer.type==='image' ? `${layer.height / 10}%` : undefined
                           }}>
                          {layer.type === 'text' ? layer.text : <img src={layer.src} alt="asset" style={{width:'100%', height:'100%', pointerEvents:'none'}} />}
                      </div>
                  ))}
                  <div style={{position:'absolute', bottom:'10px', left:'50%', transform:'translateX(-50%)', background:'rgba(0,0,0,0.1)', color:'#333', padding:'5px 10px', borderRadius:'15px', fontSize:'0.8rem', pointerEvents:'none', fontWeight: 'bold'}}>
                      Drag to move • Snap to center
                  </div>
                  {/* Circle mask visual border in Design workspace */}
                  {settings.maskShape === 'circle' && (
                    <div style={{position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:'100%', height:'100%', border:'3px dashed rgba(0,0,0,0.9)', borderRadius:'50%', pointerEvents:'none', zIndex: 999}} />
                  )}
              </div>
          )}

          {step === 'crop' && (
              <div style={{width:'100%', height:'100%', position:'relative', overflow:'hidden', background:'#000'}}>
                  <img ref={cropImgRef} src={capturedImage} alt="Crop Source" style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) translate(${cropState.x}px, ${cropState.y}px) scale(${cropState.zoom})`, width: '100%', cursor: 'move', userSelect: 'none' }} onMouseDown={(e) => { e.preventDefault(); const startX=e.clientX; const startY=e.clientY; const startPX=cropState.x; const startPY=cropState.y; const onMove=(em)=>{setCropState(prev=>({...prev,x:startPX+(em.clientX-startX),y:startPY+(em.clientY-startY)}))}; const onUp=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}; window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp); }} onTouchStart={(e) => { const touch=e.touches[0]; const startX=touch.clientX; const startY=touch.clientY; const startPX=cropState.x; const startPY=cropState.y; const onMove=(em)=>{const t=em.touches[0];setCropState(prev=>({...prev,x:startPX+(t.clientX-startX),y:startPY+(t.clientY-startY)}))}; const onEnd=()=>{window.removeEventListener('touchmove',onMove);window.removeEventListener('touchend',onEnd)}; window.addEventListener('touchmove',onMove); window.addEventListener('touchend',onEnd); }} />
                  <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', border:'4px solid rgba(255,255,255,0.3)', boxSizing:'border-box'}}></div>
                  {/* Black overlay with transparent hole (mask) — updates immediately when settings.maskShape changes */}
                  {settings.maskShape === 'circle' && (
                    <svg style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex: 30}} viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path fill="rgba(0,0,0,0.6)" fillRule="evenodd" d={'M0,0 H100 V100 H0 Z M50,50 m-48,0 a48,48 0 1,0 96,0 a48,48 0 1,0 -96,0'} />
                    </svg>
                  )}
                  <div style={{position:'absolute', bottom:'10px', left:'50%', transform:'translateX(-50%)', width:'80%', display:'flex', alignItems:'center', gap:'10px', background:'rgba(0,0,0,0.6)', padding:'5px 15px', borderRadius:'20px'}}>
                      <span style={{color:'white'}}>🔍</span>
                      <input type="range" min="1" max="3" step="0.1" value={cropState.zoom} onChange={(e) => setCropState(p => ({...p, zoom: parseFloat(e.target.value)}))} style={{flex:1}} />
                  </div>
                    <div style={{position:'absolute', bottom:'70px', left:'50%', transform:'translateX(-50%)', width:'80%', display:'flex', alignItems:'center', gap:'8px', justifyContent:'center', pointerEvents: 'auto'}}>
                      {/* Only Circle toggle available */}
                      <button className="anim-btn" style={{...styles.button, ...(settings.maskShape==='circle'?styles.btnPrimary:styles.btnSecondary)}} onClick={() => updateSetting('maskShape', settings.maskShape==='circle' ? 'none' : 'circle')}>Circle</button>
                    </div>
              </div>
          )}

          {step === 'preview' && (
             <div style={{width:'100%', height:'100%', overflow:'hidden', position:'relative', background:'#333'}}>
                <div style={{width:'100%', height:'100%', transform: `scale(${previewZoom.zoom}) translate(${previewZoom.x}px, ${previewZoom.y}px)`, transformOrigin:'center'}}><canvas ref={previewCanvasRef} style={styles.canvas} /></div>
                 <div style={{position:'absolute', bottom:'10px', left:'50%', transform:'translateX(-50%)', width:'60%', display:'flex', alignItems:'center', gap:'10px', background:'rgba(0,0,0,0.6)', padding:'5px 15px', borderRadius:'20px'}}>
                    <span style={{color:'white'}}>🔍</span><input type="range" min="1" max="5" step="0.1" value={previewZoom.zoom} onChange={(e) => setPreviewZoom(p => ({...p, zoom: parseFloat(e.target.value)}))} style={{flex:1}} />
                </div>
             </div>
          )}
          
          {isMobile && step === 'camera' && !showDesignTool && (
              <button onClick={toggleFlash} className="anim-btn" style={{position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: isFlashOn ? '#FFD700' : 'rgba(0,0,0,0.6)', color: isFlashOn ? '#333' : '#fff', border: '2px solid white', borderRadius: '20px', padding: '8px 16px', fontWeight: 'bold', zIndex: 50, display: 'flex', alignItems: 'center', gap: '5px' }}>{isFlashOn ? "🔦 ON" : "🔦 OFF"}</button>
          )}

          {step === 'alignment' && (
            <div style={styles.jogContainer}>
                <button className="anim-btn" style={styles.jogBtn} onClick={() => handleJog(-jogStep, jogStep)}>↖</button>
                <button className="anim-btn" style={styles.jogBtn} onClick={() => handleJog(0, jogStep)}>⬆</button>
                <button className="anim-btn" style={styles.jogBtn} onClick={() => handleJog(jogStep, jogStep)}>↗</button>
                <button className="anim-btn" style={styles.jogBtn} onClick={() => handleJog(-jogStep, 0)}>⬅</button>
                <button className="anim-btn" style={{...styles.jogBtn, fontSize: '0.7rem', fontWeight:'bold', background:'#FFB74D'}} onClick={() => setJogStep(s => s === 10 ? 1 : 10)}>{jogStep}mm</button>
                <button className="anim-btn" style={styles.jogBtn} onClick={() => handleJog(jogStep, 0)}>➡</button>
                <button className="anim-btn" style={styles.jogBtn} onClick={() => handleJog(-jogStep, -jogStep)}>↙</button>
                <button className="anim-btn" style={styles.jogBtn} onClick={() => handleJog(0, -jogStep)}>⬇</button>
                <button className="anim-btn" style={styles.jogBtn} onClick={() => handleJog(jogStep, -jogStep)}>↘</button>
            </div>
          )}

          {step === 'engraving' && (
             <div style={{position: 'relative', width: '100%', height: '100%'}}>
                <img src={capturedImage} alt="Progress" style={styles.engraveImage} />
                <div style={{...styles.engraveOverlay, clipPath: `inset(${progress}% 0 0 0)`}} />
                <div style={{...styles.laserLine, top: `${progress}%`}} />
             </div>
          )}
          {step === 'finished' && <div style={styles.contentArea}><h2 style={styles.title}>Done!</h2></div>}
        </div>

        {/* RIGHT: CONTROLS */}
        <div style={{ ...styles.controlsPanel, width: isMobile ? '100%' : 'auto', paddingTop: '0', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
          
          {isMobile && ( <div style={{width: '100%', padding: '10px 0', background: theme.card, zIndex: 20, borderBottom: `1px solid ${theme.accent}`, display: 'flex', justifyContent: 'center', flexShrink: 0}}>{renderStepper()}</div> )}
          {!isMobile && ( <div style={{width: '100%', flexShrink: 0, padding: '10px 0', background: theme.card, zIndex: 10, borderBottom: `2px dashed ${theme.accent}`}}><div style={styles.logoHeader}><img src="/LaserPix2.png" alt="LaserPix" style={styles.panelLogo} /></div></div> )}

          <div className="scrollable-content" style={{ flex: 1, overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: '20px', paddingTop: '10px', justifyContent: (step === 'camera' && !showDesignTool && !isMobile) ? 'space-between' : 'flex-start' }}>
              
              {step === 'camera' && !showDesignTool && (
                <>
                  <div style={styles.contentArea}>
                    <h2 style={styles.title}>Capture</h2>
                    <p style={styles.subtitle}>Align or Upload</p>
                  </div>
                  
                  {!isMobile && (
                    <div style={{width: '90%', display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px'}}>
                      <div style={{display: 'flex', gap: '10px', width: '100%'}}>
                          <button className="anim-btn" style={{...styles.bigActionBtn, flex: 1}} onClick={() => fileInputRef.current.click()}>UPLOAD</button>
                          <button className="anim-btn" style={{...styles.bigActionBtn, flex: 1}} onClick={() => { setShowDesignTool(true); setIsDragging(false); }}>DESIGN</button>
                      </div>
                      <button className="anim-btn" style={styles.primaryActionBtn} onClick={handleMainCapture}>CAPTURE</button>
                      <div style={{display: 'none'}}><input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files[0]; if (file) { setWasInDesignMode(false); const reader = new FileReader(); reader.onload = (ev) => { setCapturedImage(ev.target.result); setCropState({ x: 0, y: 0, zoom: 1 }); const img = new Image(); img.onload = () => setStep('crop'); img.src = ev.target.result; }; reader.readAsDataURL(file); } }} accept="image/*" /></div>
                    </div>
                  )}
                </>
              )}

              {/* === DESIGN TOOL CONTROLS === */}
              {showDesignTool && (
                  <div style={{width:'90%', display:'flex', flexDirection:'column', gap:'15px'}}>
                      <h2 style={styles.title}>Design Editor</h2>
                      <div style={{display:'flex', gap:'8px', marginBottom:'6px', flexWrap:'wrap'}}>
                        {/* Only Circle Mask toggle — clicking toggles on/off */}
                        <button className="anim-btn" style={{...styles.button, ...(settings.maskShape==='circle'?styles.btnPrimary:styles.btnSecondary)}} onClick={() => updateSetting('maskShape', settings.maskShape==='circle' ? 'none' : 'circle')}>Circle Mask</button>
                      </div>
                      
                      {!activeLayer ? (
                          <div style={{textAlign:'center', padding:'20px', color: theme.subText, border: `1px dashed ${theme.accent}`, borderRadius:'8px'}}>
                              No layer selected. <br/>Add Text or a Picture to edit.
                          </div>
                      ) : (
                        <>
                          {/* CONTROLS BASED ON SELECTION TYPE */}
                          {activeLayer.type === 'text' ? (
                              <>
                                  <textarea rows={2} value={activeLayer.text} onChange={(e) => updateLayer('text', e.target.value)} style={{width:'100%', padding:'12px', fontSize:'1.2rem', textAlign:'center', borderRadius:'8px', border:`2px solid ${theme.accent}`, background: theme.bg, color: theme.text, fontFamily: activeLayer.fontFamily}} />
                                  
                                  <div style={{display:'flex', gap:'5px', overflowX:'auto', paddingBottom:'5px'}}>
                                      <select value={activeLayer.fontFamily} onChange={(e) => updateLayer('fontFamily', e.target.value)} style={{...styles.select, flex:2}}> {FONTS.map(f => <option key={f} value={f} style={{fontFamily: f}}>{f}</option>)} </select>
                                      <button style={{...styles.button, background: activeLayer.fontWeight==='bold'?theme.accent:theme.buttonSec, padding:'8px', minWidth:'40px'}} onClick={() => updateLayer('fontWeight', activeLayer.fontWeight==='bold'?'normal':'bold')}><b>B</b></button>
                                      <button style={{...styles.button, background: activeLayer.fontStyle==='italic'?theme.accent:theme.buttonSec, padding:'8px', minWidth:'40px'}} onClick={() => updateLayer('fontStyle', activeLayer.fontStyle==='italic'?'normal':'italic')}><i>I</i></button>
                                  </div>
                                  
                                  {/* ALIGNMENT BUTTONS */}
                                  <div style={{display:'flex', gap:'5px', justifyContent:'center'}}>
                                    <button className="anim-btn" style={{...styles.button, background: activeLayer.textAlign==='left'?theme.accent:theme.buttonSec, padding:'5px 15px', fontSize:'0.8rem'}} onClick={() => updateLayer('textAlign', 'left')}>LEFT</button>
                                    <button className="anim-btn" style={{...styles.button, background: activeLayer.textAlign==='center'?theme.accent:theme.buttonSec, padding:'5px 15px', fontSize:'0.8rem'}} onClick={() => updateLayer('textAlign', 'center')}>CENTER</button>
                                    <button className="anim-btn" style={{...styles.button, background: activeLayer.textAlign==='right'?theme.accent:theme.buttonSec, padding:'5px 15px', fontSize:'0.8rem'}} onClick={() => updateLayer('textAlign', 'right')}>RIGHT</button>
                                  </div>

                                  <div>
                                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px'}}>
                                          <label style={styles.label}>Size: {activeLayer.fontSize}</label>
                                          <button className="anim-btn" style={{background:'none', border:'none', color:theme.text, cursor:'pointer', fontSize:'1.2rem', padding:'0 5px'}} onClick={() => updateLayer('fontSize', 150)}>↺</button>
                                      </div>
                                      <input type="range" min="5" max="600" value={activeLayer.fontSize} onChange={(e) => updateLayer('fontSize', parseInt(e.target.value))} style={styles.slider} />
                                  </div>
                              </>
                          ) : (
                              <>
                                  <p style={{textAlign:'center', color:theme.text}}>Image Selected</p>
                                  <div>
                                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px'}}>
                                          <label style={styles.label}>Size: {activeLayer.width}%</label>
                                          <button className="anim-btn" style={{background:'none', border:'none', color:theme.text, cursor:'pointer', fontSize:'1.2rem', padding:'0 5px'}} onClick={() => updateLayer('width', 30)}>↺</button>
                                      </div>
                                      <input type="range" min="10" max="1500" value={activeLayer.width} onChange={(e) => { const newWidth = parseInt(e.target.value); const ar = activeLayer.aspectRatio || (activeLayer.width && activeLayer.height ? (activeLayer.height / activeLayer.width) : 1); updateLayer('width', newWidth); updateLayer('height', Math.round(newWidth * ar)); }} style={styles.slider} />
                                  </div>
                              </>
                          )}
                          
                          {/* --- ROTATION SLIDER --- */}
                          <div>
                              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'5px'}}>
                                  <label style={styles.label}>Rotation: {activeLayer.rotation || 0}°</label>
                                  <button className="anim-btn" style={{background:'none', border:'none', color:theme.text, cursor:'pointer', fontSize:'1.2rem', padding:'0 5px'}} onClick={() => updateLayer('rotation', 0)}>↺</button>
                              </div>
                              <input type="range" min="-180" max="180" value={activeLayer.rotation || 0} onChange={(e) => updateLayer('rotation', parseInt(e.target.value))} style={styles.slider} />
                          </div>
                        </>
                      )}

                      {/* LAYER MANAGEMENT */}
                      <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
                          <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, fontSize:'0.8rem'}} onClick={addTextLayer}>+ Text</button>
                          <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, fontSize:'0.8rem'}} onClick={() => setShowAssetModal(true)}>+ Picture</button>
                          <button className="anim-btn" style={{...styles.button, ...styles.btnDanger, fontSize:'0.8rem'}} onClick={deleteLayer}>Delete</button>
                      </div>

                      {/* --- LAYER ORDERING CONTROLS --- */}
                      {activeLayer && (
                        <div style={{display:'flex', gap:'5px', justifyContent:'center', marginTop:'10px'}}>
                            <label style={{...styles.label, marginBottom:0, alignSelf:'center'}}>Layer Order:</label>
                            <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, padding:'5px 10px', fontSize:'0.8rem'}} onClick={() => moveLayer('up')}>Bring Forward ⬆️</button>
                            <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, padding:'5px 10px', fontSize:'0.8rem'}} onClick={() => moveLayer('down')}>Send Backward ⬇️</button>
                        </div>
                      )}

                      {/* ACTION BUTTONS (DESKTOP) */}
                      {!isMobile && (
                        <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                            <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex:1}} onClick={() => {setShowDesignTool(false); setWasInDesignMode(false);}}>Cancel</button>
                            <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex:1}} onClick={finalizeDesign}>USE THIS</button>
                        </div>
                      )}
                  </div>
              )}

              {step === 'crop' && (
                <>
                  <div style={styles.contentArea}><h2 style={styles.title}>Crop Image</h2><p style={styles.subtitle}>Drag & Pinch to Adjust</p></div>
                  {!isMobile && (
                    <div style={{width:'100%', display:'flex', gap:'10px', marginTop:'20px', justifyContent: 'center'}}>
                        <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex: 1}} onClick={handleCropBack}>BACK</button>
                        <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex: 1}} onClick={confirmMainCrop}>CONFIRM</button>
                    </div>
                  )}
                </>
              )}

              {step === 'preview' && (
                <div style={{width: '90%'}}>
                    <h2 style={{...styles.title, fontSize: isMobile ? '1.5rem' : '2rem'}}>Settings</h2>
                    
                    {estimatedTime && ( <div style={{textAlign:'center', background: theme.buttonSec, padding:'10px', borderRadius:'8px', marginBottom:'10px', border:`1px solid ${theme.accent}`}}><span style={{fontWeight:'bold', color: theme.text}}>⏱️ Est. Time: {estimatedTime}</span></div> )}
                    
                      <details open={!isMobile}>
                        <summary>🖼️ Image Processing</summary>
                        <div>
                            <div style={{...styles.presetSelectorContainer, marginBottom:0, textAlign: 'center'}}>
                                <label style={styles.infoLabel}>Work Area:</label>
                                <div style={{display:'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap'}}>
                                    {Object.keys(MACHINE_PRESETS).map(key => (
                                        <button key={key} className="anim-btn" style={{...styles.button, ...styles.btnSecondary, padding:'8px', fontSize:'0.7rem', background: currentPresetName===key?theme.subText:theme.buttonSec, color:currentPresetName===key?theme.bg:theme.buttonText}} onClick={() => applyPreset(key)}>{key}</button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Engraving shape selector removed (moved to Crop/Design) */}

                            <div style={{...styles.infoBox, display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center'}}>
                              <label style={styles.infoLabel}>Mirror:</label>
                              <button className="anim-btn" style={{...styles.button, background: settings.flipH ? '#FFB74D' : undefined}} onClick={() => updateSetting('flipH', !settings.flipH)}>Flip H</button>
                              <button className="anim-btn" style={{...styles.button, background: settings.flipV ? '#FFB74D' : undefined}} onClick={() => updateSetting('flipV', !settings.flipV)}>Flip V</button>
                            </div>

                            <div style={styles.infoBox}>
                              <label style={styles.infoLabel}>Background Removal:</label>
                              <select value={settings.bgRemovalMethod} onChange={(e) => updateSetting('bgRemovalMethod', e.target.value)} style={styles.select}><option value="none">None</option><option value="local">Local AI (Free)</option><option value="cloud">Cloud AI (Best)</option></select>
                            </div>
                            <label style={styles.checkboxContainer}><input type="checkbox" checked={settings.enableLineArt} onChange={(e) => updateSetting('enableLineArt', e.target.checked)} style={{transform: 'scale(1.3)'}} /><span style={{color: '#E65100', fontSize: '0.9rem'}}>Enable Stencil / Line Art</span></label>
                            {settings.enableLineArt && (<div style={styles.subSettingsGroup}><label style={styles.label}>Sensitivity</label> <input type="range" min="1" max="20" step="0.5" value={settings.sketchParams.threshold} onChange={(e) => updateSketchParam('threshold', parseFloat(e.target.value))} style={styles.slider} /><label style={styles.label}>Thickness</label> <input type="range" min="5" max="50" step="1" value={settings.sketchParams.thickness} onChange={(e) => updateSketchParam('thickness', parseInt(e.target.value))} style={styles.slider} /></div>)}
                            <div style={{display:'flex', gap:'5px', marginTop:'5px', flexWrap:'wrap', justifyContent: 'center'}}><label style={{...styles.checkboxLabel, fontSize:'0.8rem'}}><input type="checkbox" checked={settings.dither} onChange={(e) => updateSetting('dither', e.target.checked)} /> Dither</label><label style={{...styles.checkboxLabel, fontSize:'0.8rem'}}><input type="checkbox" checked={settings.invert} onChange={(e) => updateSetting('invert', e.target.checked)} /> Invert</label></div>
                            <div style={{display: 'flex', gap: '5px', marginTop: '10px', justifyContent: 'center'}}>
                              <button className="anim-btn" style={{...styles.button, ...styles.btnWarning, padding:'8px'}} onClick={() => window.confirm('Reset?') && setSettings(s => ({...s, enableLineArt: false, invert: false, bgRemovalMethod: 'none'}))}>Reset</button>
                              <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, padding:'8px'}} onClick={processBackgroundRemoval}>Process</button>
                            </div>
                        </div>
                    </details>
                    
                    <details open={!isMobile}>
                        <summary>⚡ Laser Settings</summary>
                        <div>
                          <label style={styles.label}>Power: {settings.power}%</label>
                          <input type="range" min="1" max="100" value={settings.power} onChange={(e) => updateSetting('power', parseInt(e.target.value))} style={styles.slider} />

                          <label style={styles.label}>Speed: {settings.speed}</label>
                          <input type="range" min="500" max="5000" step="100" value={settings.speed} onChange={(e) => updateSetting('speed', parseInt(e.target.value))} style={styles.slider} />

                          <label style={styles.label}>Travel Speed: {settings.travelSpeed}</label>
                          <input type="range" min="200" max="6000" step="100" value={settings.travelSpeed} onChange={(e) => updateSetting('travelSpeed', parseInt(e.target.value))} style={styles.slider} />

                          <label style={styles.label}>Res (L/mm): {settings.linesPerMm}</label>
                          <input type="range" min="1" max="10" step="1" value={settings.linesPerMm} onChange={(e) => updateSetting('linesPerMm', parseInt(e.target.value))} style={styles.slider} />
                        </div>
                    </details>

                    {!isMobile && (
                      <div style={{width:'100%', display:'flex', gap:'10px', marginTop:'15px', marginBottom: '20px', justifyContent: 'center'}}>
                        <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary}} onClick={() => setStep('crop')}>BACK</button>
                        {/* --- UPDATE 7: DESKTOP SAVE BUTTON --- */}
                        <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary}} onClick={downloadImage}>SAVE IMG</button>
                        <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary}} onClick={() => setStep('alignment')}>NEXT</button>
                      </div>
                    )}
                </div>
              )}

              {step === 'alignment' && (
                <>
                  <div style={styles.contentArea}>
                      <h2 style={styles.title}>Place Wood</h2>
                      <div style={styles.settingsGroup}>
                          <p style={{fontSize:'0.9rem', color: theme.text, marginBottom: '10px', textAlign: 'center', width: '100%'}}><b>Safety Check:</b> Confirm wood is placed to unlock.</p>
                          <div style={styles.lockContainer}><span>🔒</span><span style={styles.lockText}>{isEngravingUnlocked ? "READY" : "Confirm wood is placed"}</span><input type="checkbox" checked={isEngravingUnlocked} onChange={(e) => setIsEngravingUnlocked(e.target.checked)} style={{transform: 'scale(1.5)'}} /></div>
                      </div>
                  </div>
                  {!isMobile && (
                    <div style={{width:'90%', display:'flex', flexDirection:'column', gap:'10px', marginTop:'20px'}}>
                        <div style={{display:'flex', gap:'5px', flex: 1}}>
                            <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, flex: 1, padding:'12px 5px'}} onClick={handleFrame}>FRAME</button>
                            <button className="anim-btn" style={{...styles.button, ...(isAligned ? styles.btnSecondary : styles.btnWarning), flex: 1, padding:'12px 5px'}} onClick={handleToggleAlignment}>{isAligned ? "RESET" : "AIM"}</button>
                        </div>
                        <button className="anim-btn" style={{...styles.button, ...(isEngravingUnlocked ? styles.btnPrimary : {background:'#ccc', cursor:'not-allowed'}), width: '100%'}} onClick={initiateEngrave} disabled={!isEngravingUnlocked}>START</button>
                        <button className="anim-btn" style={{...styles.button, ...styles.btnSecondary, width: '100%'}} onClick={() => setStep('preview')}>BACK</button>
                    </div>
                  )}
                </>
              )}

              {step === 'engraving' && (
                <>
                  <div style={styles.contentArea}>
                      <h2 style={styles.title}>{isPaused ? "PAUSED" : "ENGRAVING"}</h2>
                      <div style={styles.progressBarContainer}><div style={{...styles.progressBarFill, width: `${progress}%`}}/></div>
                  </div>
                  {!isMobile && (
                    <div style={{width:'90%', display:'flex', gap:'10px', marginTop:'20px'}}>
                      {!isPaused ? 
                          <button className="anim-btn" style={{...styles.button, ...styles.btnWarning, flex: 1}} onClick={() => { pausedRef.current = true; setIsPaused(true); window.electron?.sendGcode('M5'); }}>PAUSE</button> :
                          <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, flex: 1}} onClick={() => { pausedRef.current = false; setIsPaused(false); window.electron?.sendGcode('M4 S0'); sendNextLine(); }}>RESUME</button>
                      }
                      <button className="anim-btn" style={{...styles.button, ...styles.btnDanger, flex: 1}} onClick={() => { stopRef.current = true; window.electron?.sendGcode('M5'); window.electron?.sendGcode('G0 X0 Y0'); setStep('camera'); }}>STOP</button>
                    </div>
                  )}
                </>
              )}
              
              {step === 'finished' && !isMobile && (
                  <button className="anim-btn" style={{...styles.button, ...styles.btnPrimary, width: '90%', marginTop:'20px'}} onClick={() => window.location.reload()}>NEW JOB</button>
              )}
              
              {isMobile && renderBottomButtons()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
