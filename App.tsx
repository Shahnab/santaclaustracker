
import React, { useState, useEffect } from 'react';
import GlobeMap from './components/GlobeMap';
import HudBox from './components/DataPanel';
import { SantaState, IntelLogEntry, ViewMode } from './types';
import { getSantaLocation, calculateGifts, generateIntelMessage } from './services/trackingService';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.OPTICAL);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Check if it's December 25th anywhere in the world
  // Christmas spans from when UTC+14 enters Dec 25 (10:00 Dec 24 UTC) 
  // until UTC-12 exits Dec 25 (11:59 Dec 26 UTC)
  const isChristmas = (() => {
    const utcMonth = currentTime.getUTCMonth();
    const utcDate = currentTime.getUTCDate();
    const utcHours = currentTime.getUTCHours();
    
    // If it's Dec 25 in UTC, it's definitely Christmas somewhere
    if (utcMonth === 11 && utcDate === 25) return true;
    
    // If it's Dec 24 after 10:00 UTC, it's Christmas in UTC+14
    if (utcMonth === 11 && utcDate === 24 && utcHours >= 10) return true;
    
    // If it's Dec 26 before 12:00 UTC, it's still Christmas in UTC-12
    if (utcMonth === 11 && utcDate === 26 && utcHours < 12) return true;
    
    return false;
  })();
  
  // Dynamic color theme based on view mode
  const theme = {
    primary: viewMode === ViewMode.THERMAL ? '#ff6600' : (viewMode === ViewMode.NIGHT_VISION ? '#00ff00' : '#00ffff'),
    primaryDark: viewMode === ViewMode.THERMAL ? '#cc4400' : (viewMode === ViewMode.NIGHT_VISION ? '#00aa00' : '#0099aa'),
    primaryLight: viewMode === ViewMode.THERMAL ? '#ff8844' : (viewMode === ViewMode.NIGHT_VISION ? '#44ff44' : '#44ffff'),
    secondary: viewMode === ViewMode.THERMAL ? '#ffaa44' : (viewMode === ViewMode.NIGHT_VISION ? '#88ff88' : '#88ffff'),
    accent: viewMode === ViewMode.THERMAL ? '#ff4400' : (viewMode === ViewMode.NIGHT_VISION ? '#00cc00' : '#00ccff'),
    glow: viewMode === ViewMode.THERMAL ? 'rgba(255,102,0,0.3)' : (viewMode === ViewMode.NIGHT_VISION ? 'rgba(0,255,0,0.3)' : 'rgba(0,255,255,0.3)'),
    glowStrong: viewMode === ViewMode.THERMAL ? 'rgba(255,102,0,0.6)' : (viewMode === ViewMode.NIGHT_VISION ? 'rgba(0,255,0,0.6)' : 'rgba(0,255,255,0.6)'),
  };
  
  // Santa State
  const [santa, setSanta] = useState<SantaState>({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    speed: 4.2,
    altitude: 35000,
    giftsDelivered: 4500000000,
    locationName: "NORTH POLE",
    nextStop: "CLASSIFIED",
    currentRegion: "ARCTIC",
    localTime: "00:00",
    coordinates: [90, 0],
    visitedLocations: []
  });
  
  const [plannedRoute, setPlannedRoute] = useState<[number, number][]>([]);

  const [logs, setLogs] = useState<IntelLogEntry[]>([]);

  // Time ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Tracking Loop (Only Active on December 25th)
  useEffect(() => {
    if (!isChristmas) return;
    
    const interval = setInterval(() => {
      const trackingData = getSantaLocation();
      
      setSanta(prev => ({
        ...prev,
        locationName: trackingData.location.name,
        currentRegion: trackingData.location.region,
        localTime: trackingData.localTime,
        coordinates: trackingData.location.coordinates,
        visitedLocations: trackingData.visitedLocations,
        altitude: 35000 + Math.sin(Date.now() / 2000) * 150,
        speed: 4.2 + (Math.random() - 0.5) * 0.05,
        giftsDelivered: calculateGifts()
      }));
      
      setPlannedRoute(trackingData.plannedRoute);
    }, 1000);
    return () => clearInterval(interval);
  }, [isChristmas]);

  // Logic-Driven Intel Loop (Only on December 25th)
  useEffect(() => {
    if (!isChristmas) {
      // Show error messages when not Christmas
      setLogs([{
        id: 'error-1',
        timestamp: new Date().toLocaleTimeString('en-US', {hour12: false}),
        message: 'SYSTEM ERROR: TRACKER OFFLINE - UNAUTHORIZED DATE',
        priority: 'HIGH' as const
      }, {
        id: 'error-2',
        timestamp: new Date().toLocaleTimeString('en-US', {hour12: false}),
        message: 'ACCESS DENIED: SANTA CLAUS TRACKER OPERATIONAL ONLY ON 25-DEC',
        priority: 'HIGH' as const
      }, {
        id: 'error-3',
        timestamp: new Date().toLocaleTimeString('en-US', {hour12: false}),
        message: 'SIGNAL LOST: NO SLEIGH DETECTED IN AIRSPACE',
        priority: 'HIGH' as const
      }]);
      return;
    }
    
    // Immediate log on start or location change
    const addLog = () => {
        const message = generateIntelMessage(santa.locationName, santa.currentRegion, santa.speed, santa.giftsDelivered);
        setLogs(prev => [{
            id: Date.now().toString() + Math.random(), // Ensure unique ID
            timestamp: new Date().toLocaleTimeString('en-US', {hour12: false}),
            message: message,
            priority: 'MED' as const
        }, ...prev].slice(0, 5)); // Keep last 5
    };

    addLog();
    const loop = setInterval(addLog, 6000); // New log every 6 seconds for faster feel
    return () => clearInterval(loop);
  }, [santa.locationName, santa.currentRegion, isChristmas]); // Dependency on location/region ensures immediate update on change


  // --- MAIN APP ---
  return (
    <div className="relative w-screen h-screen bg-black text-white font-mono overflow-hidden select-none">
      
      {/* --- 3D MAP BACKGROUND LAYER --- */}
      <div className="absolute inset-0 z-0 bg-black">
         <GlobeMap 
            santaPosition={santa.coordinates} 
            visitedLocations={santa.visitedLocations}
            plannedRoute={plannedRoute}
            viewMode={viewMode}
            isActive={isChristmas}
         />
         
         <div className="absolute inset-0 pointer-events-none z-10 scanlines opacity-10"></div>
         <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,10,10,0.8)_100%)]"></div>
         
         {/* Error Overlay when not Christmas */}
         {!isChristmas && (
           <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
             <div className="text-center">
               <div className="text-6xl font-bold text-red-500 glitch-text mb-4">
                 SYSTEM OFFLINE
               </div>
               <div className="text-2xl text-red-400 glitch mb-6">
                 SANTA CLAUS TRACKER INACTIVE
               </div>
               <div className="text-lg text-red-300 border-2 border-red-500/50 bg-red-900/20 px-8 py-4 inline-block">
                 <div className="mb-2">⚠️ OPERATIONAL WINDOW: DECEMBER 25TH ONLY ⚠️</div>
                 <div className="text-sm text-red-400 mt-2">Current Date: {currentTime.toLocaleDateString()}</div>
               </div>
             </div>
           </div>
         )}
         
         {/* Grid Overlay */}
         <div className="absolute inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 flex flex-col pointer-events-none z-20">
        
        {/* --- TOP BAR --- */}
        <header className="h-14 bg-gradient-to-r from-[#051014]/95 via-[#051014]/90 to-[#051014]/95 backdrop-blur-md border-b-2 flex items-center justify-between px-6 text-xs tracking-wider z-50 relative overflow-hidden" style={{borderColor: theme.primary + '30', boxShadow: `0 5px 30px ${theme.glow}`}}>
           {/* Animated background bar */}
           <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent to-transparent shimmer opacity-50" style={{backgroundImage: `linear-gradient(to right, transparent, ${theme.primaryLight}, transparent)`}}></div>
           
           <div className="flex items-center gap-4 w-1/3">
              <div className="w-10 h-10 border-2 flex items-center justify-center pulse-glow relative" style={{backgroundColor: theme.primary + '30', borderColor: theme.primary + '50'}}>
                 <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor: theme.primaryLight}}></div>
                 <div className="absolute inset-0 blur-sm" style={{backgroundColor: theme.primary + '10'}}></div>
              </div>
              <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-widest" style={{color: theme.secondary}}>SANTA CLAUS TRACKER</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px]" style={{color: theme.primaryDark}}>SATCOM LINK:</span>
                    <span className="text-[9px] text-green-400 font-bold flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                      ACTIVE
                    </span>
                  </div>
              </div>
           </div>
           
           <div className="w-1/3 text-center">
              <span className="bg-red-900/30 px-5 py-1.5 border-2 border-red-500/50 text-red-300 font-bold tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.3)] relative">
                <span className="relative z-10">CLASSIFICATION: SECRET//SHAHNAB</span>
                <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
              </span>
           </div>
           
           <div className="w-1/3 text-right font-bold flex items-center justify-end gap-2" style={{color: theme.secondary}}>
              <span style={{color: theme.primaryDark}}>SYS_TIME:</span>
              <span className="tabular-nums bg-black/40 px-2 py-1 border shadow-inner" style={{borderColor: theme.primaryDark + '50'}}>
                {currentTime.toLocaleString()}
              </span>
           </div>
        </header>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="flex-1 flex relative p-6">
            
            {/* --- LEFT COLUMN --- */}
            <div className="w-80 flex flex-col gap-4 pointer-events-auto h-full justify-start">
                
                {/* 1. Log Feed */}
                <HudBox title={isChristmas ? "DECLASSIFIED THERMAG FEED" : "DECLASSIFIED THERMAG FEED [ERROR]"} className={`h-96 relative overflow-hidden ${!isChristmas ? 'glitch' : ''}`} style={{borderLeft: `4px solid ${!isChristmas ? '#ff0000' : theme.primary}`}} themeColor={!isChristmas ? '#ff0000' : theme.primary} themeDark={!isChristmas ? '#cc0000' : theme.primaryDark} themeLight={!isChristmas ? '#ff4444' : theme.primaryLight}>
                   {/* Animated side indicator */}
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent to-transparent data-stream opacity-30" style={{backgroundImage: `linear-gradient(to bottom, transparent, ${theme.primaryLight}, transparent)`}}></div>
                   
                   <div className="h-full overflow-hidden flex flex-col gap-3 relative">
                      {logs.map((log, idx) => (
                        <div key={log.id} className={`text-[10px] pb-2 animate-[slideIn_0.3s_ease-out] relative group ${!isChristmas ? 'glitch-text' : ''}`} style={{animationDelay: `${idx * 0.05}s`, borderBottom: `1px solid ${!isChristmas ? '#ff0000' : theme.primaryDark}30`}}>
                            <div className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 mt-1 rounded-full flex-shrink-0 group-hover:shadow-[0_0_12px] transition-shadow" style={{backgroundColor: !isChristmas ? '#ff0000' : theme.primary, boxShadow: `0 0 6px ${!isChristmas ? 'rgba(255,0,0,0.6)' : theme.glowStrong}`}}></span>
                              <div>
                                <span className="mr-2 font-bold" style={{color: !isChristmas ? '#ff4444' : theme.primaryDark}}>[{log.timestamp}]</span>
                                <span style={{color: !isChristmas ? '#ff8888' : theme.secondary}}>{log.message}</span>
                              </div>
                            </div>
                        </div>
                      ))}
                   </div>
                </HudBox>

                {/* 2. Gifts Delivered (Big Box) */}
                <HudBox className={`bg-gradient-to-br from-[#050a0a]/95 to-[#0a1520]/95 border-2 relative overflow-hidden ${!isChristmas ? 'glitch' : ''}`} style={{borderColor: !isChristmas ? '#ff0000' : theme.primaryDark}} themeColor={!isChristmas ? '#ff0000' : theme.primary} themeDark={!isChristmas ? '#cc0000' : theme.primaryDark} themeLight={!isChristmas ? '#ff4444' : theme.primaryLight}>
                    <div className="absolute top-0 right-0 w-24 h-24 blur-3xl" style={{backgroundColor: theme.primary + '05'}}></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] uppercase tracking-widest font-bold ${!isChristmas ? 'glitch-text' : ''}`} style={{color: !isChristmas ? '#ff4444' : theme.primaryLight}}>Payload Delivered</span>
                        <span className={`text-[8px] px-2 py-0.5 border rounded ${!isChristmas ? 'text-red-400 bg-red-900/30 border-red-500/30 animate-pulse' : 'text-green-400 bg-green-900/30 border-green-500/30'}`}>{isChristmas ? 'LIVE' : 'OFFLINE'}</span>
                      </div>
                      {isChristmas ? (
                        <>
                          <div className="text-5xl font-bold tracking-tighter tabular-nums drop-shadow-[0_0_10px]" style={{color: theme.secondary, textShadow: `0 0 10px ${theme.glow}`}}>
                              {santa.giftsDelivered.toLocaleString()}
                          </div>
                          <div className="w-full h-2 mt-4 relative overflow-hidden rounded-full border" style={{backgroundColor: theme.primaryDark + '30', borderColor: theme.primaryDark + '50'}}>
                              <div className="absolute top-0 left-0 h-full bg-gradient-to-r w-full shimmer" style={{backgroundImage: `linear-gradient(to right, ${theme.primaryDark}, ${theme.primaryLight}, ${theme.primaryDark})`, boxShadow: `0 0 10px ${theme.glowStrong}`}}></div>
                          </div>
                          <div className="flex justify-between text-[9px] mt-2" style={{color: theme.primaryDark}}>
                            <span>RATE: +{Math.floor(Math.random() * 1000 + 5000).toLocaleString()}/s</span>
                            <span>EFFICIENCY: 99.8%</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-5xl font-bold tracking-tighter tabular-nums glitch-text text-red-500">
                              NO SIGNAL
                          </div>
                          <div className="w-full h-2 mt-4 relative overflow-hidden rounded-full border border-red-500/30 bg-red-900/20">
                              <div className="absolute top-0 left-0 h-full bg-red-500/50 w-0"></div>
                          </div>
                          <div className="flex justify-between text-[9px] mt-2 text-red-400">
                            <span>STATUS: INACTIVE</span>
                            <span>NEXT ACTIVE: 25-DEC</span>
                          </div>
                        </>
                      )}
                    </div>
                </HudBox>
                
                {/* 3. Video Feed - Picture in Picture */}
                <div className={`relative bg-black/80 overflow-hidden ${!isChristmas ? 'glitch' : ''}`} style={{border: `1px solid ${!isChristmas ? '#ff0000' : theme.primary}50`}}>
                    <div className={`absolute top-0 left-0 right-0 px-2 py-1 text-[8px] border-b z-10 uppercase tracking-wider ${!isChristmas ? 'glitch-text' : ''}`} style={{backgroundColor: !isChristmas ? '#330000' : theme.primaryDark + '60', color: !isChristmas ? '#ff4444' : theme.secondary, borderColor: !isChristmas ? '#ff0000' : theme.primary + '50'}}>
                        {isChristmas ? 'LIVE FEED: TRK-12-24-A' : 'FEED OFFLINE: NO SIGNAL'}
                    </div>
                    {isChristmas ? (
                      <video 
                          src="./video/santa1.mp4" 
                          autoPlay 
                          loop 
                          muted 
                          playsInline
                          className="w-full h-48 object-cover mt-5"
                          style={{
                            filter: viewMode === ViewMode.THERMAL 
                              ? 'grayscale(100%) contrast(150%) brightness(120%) sepia(100%) hue-rotate(-50deg) saturate(400%)'
                              : viewMode === ViewMode.NIGHT_VISION
                              ? 'grayscale(100%) contrast(130%) brightness(150%) sepia(100%) hue-rotate(50deg) saturate(300%)'
                              : 'contrast(110%) brightness(105%)'
                          }}
                      />
                    ) : (
                      <div className="w-full h-48 mt-5 bg-black flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,#ff0000,#ff0000_1px,transparent_1px,transparent_2px)] opacity-10 animate-pulse"></div>
                        <div className="text-red-500 text-2xl font-bold glitch-text">NO SIGNAL</div>
                      </div>
                    )}
                    {/* Corner accents */}
                    <div className="absolute top-5 left-0 w-4 h-4 border-t-2 border-l-2" style={{borderColor: !isChristmas ? '#ff0000' : theme.primaryLight}}></div>
                    <div className="absolute top-5 right-0 w-4 h-4 border-t-2 border-r-2" style={{borderColor: !isChristmas ? '#ff0000' : theme.primaryLight}}></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{borderColor: !isChristmas ? '#ff0000' : theme.primaryLight}}></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{borderColor: !isChristmas ? '#ff0000' : theme.primaryLight}}></div>
                </div>
            </div>

            {/* --- CENTER AREA (RETICLE) --- */}
            <div className="flex-1 relative mx-8">
                {/* Center Reticle Box */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[50%] border ${!isChristmas ? 'glitch' : ''}`} style={{borderColor: !isChristmas ? '#ff0000' : theme.primary + '30'}}>
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2" style={{borderColor: !isChristmas ? '#ff0000' : theme.secondary}}></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2" style={{borderColor: !isChristmas ? '#ff0000' : theme.secondary}}></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2" style={{borderColor: !isChristmas ? '#ff0000' : theme.secondary}}></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2" style={{borderColor: !isChristmas ? '#ff0000' : theme.secondary}}></div>

                    {/* Top Label */}
                    <div className="absolute -top-8 left-0 flex items-center gap-2">
                        <span className={`px-2 py-1 text-[10px] border ${!isChristmas ? 'glitch-text' : ''}`} style={{backgroundColor: !isChristmas ? '#330000' : theme.primaryDark + '80', color: !isChristmas ? '#ff4444' : theme.secondary, borderColor: !isChristmas ? '#ff0000' : theme.primary + '50'}}>
                           {isChristmas ? 'TRK 12-24-A (RED SLED)' : 'TRK OFFLINE - NO TARGET'}
                        </span>
                    </div>

                    {/* RIGHT: Telemetry */}
                    <div className="absolute top-8 -right-36 w-48">
                        <HudBox className={`bg-black/70 text-xs ${!isChristmas ? 'glitch' : ''}`} style={{borderColor: !isChristmas ? '#ff0000' : theme.primaryDark}} themeColor={!isChristmas ? '#ff0000' : theme.primary} themeDark={!isChristmas ? '#cc0000' : theme.primaryDark} themeLight={!isChristmas ? '#ff4444' : theme.primaryLight}>
                            {isChristmas ? (
                              <>
                                <div className="flex justify-between mb-1">
                                    <span style={{color: theme.primaryDark}}>ALT:</span> 
                                    <span className="font-bold" style={{color: theme.secondary}}>{Math.round(santa.altitude).toLocaleString()} FT</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span style={{color: theme.primaryDark}}>SPEED:</span> 
                                    <span className="font-bold" style={{color: theme.secondary}}>MACH {santa.speed.toFixed(2)}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span style={{color: theme.primaryDark}}>CONF:</span> 
                                    <span className="font-bold" style={{color: theme.secondary}}>99.9%</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between mb-1">
                                    <span className="text-red-400">ALT:</span> 
                                    <span className="font-bold text-red-500 glitch-text">N/A</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-red-400">SPEED:</span> 
                                    <span className="font-bold text-red-500 glitch-text">N/A</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-red-400">STATUS:</span> 
                                    <span className="font-bold text-red-500 glitch-text">OFFLINE</span>
                                </div>
                              </>
                            )}
                        </HudBox>
                        {/* Connector */}
                        <div className="absolute top-6 -left-12 w-12 h-[1px]" style={{backgroundColor: !isChristmas ? '#ff0000' : theme.primary + '50'}}></div>
                        <div className="absolute top-6 -left-12 w-1 h-1 rounded-full" style={{backgroundColor: !isChristmas ? '#ff0000' : theme.secondary, boxShadow: `0 0 10px ${!isChristmas ? '#ff0000' : theme.primary}`}}></div>
                    </div>

                     {/* LEFT: Location Data */}
                     <div className="absolute -bottom-12 -left-20 w-56">
                        <HudBox className={`bg-black/70 text-xs ${!isChristmas ? 'glitch' : ''}`} style={{borderColor: !isChristmas ? '#ff0000' : theme.primaryDark}} themeColor={!isChristmas ? '#ff0000' : theme.primary} themeDark={!isChristmas ? '#cc0000' : theme.primaryDark} themeLight={!isChristmas ? '#ff4444' : theme.primaryLight}>
                            {isChristmas ? (
                              <>
                                <div className="flex justify-between pb-1 mb-1" style={{borderBottom: `1px solid ${theme.primaryDark}`}}>
                                    <span style={{color: theme.primary}}>SECTOR:</span>
                                    <span className="text-white">{santa.currentRegion}</span>
                                </div>
                                <div className="text-[10px] mb-1" style={{color: theme.primaryDark}}>TARGET LOCK:</div>
                                <div className="font-bold text-xl text-white flicker">{santa.locationName}</div>
                                <div className="text-right text-[10px] mt-1" style={{color: theme.primaryLight}}>
                                    COORDS: {santa.coordinates[0].toFixed(2)}, {santa.coordinates[1].toFixed(2)}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between pb-1 mb-1 border-b border-red-500/30">
                                    <span className="text-red-400">SECTOR:</span>
                                    <span className="text-red-500 glitch-text">UNKNOWN</span>
                                </div>
                                <div className="text-[10px] mb-1 text-red-400">TARGET LOCK:</div>
                                <div className="font-bold text-xl text-red-500 glitch-text">NO SIGNAL</div>
                                <div className="text-right text-[10px] mt-1 text-red-400">
                                    STATUS: INACTIVE
                                </div>
                              </>
                            )}
                        </HudBox>
                        {/* Connector */}
                        <div className="absolute top-[-10px] right-8 w-[1px] h-[10px]" style={{backgroundColor: !isChristmas ? '#ff0000' : theme.primary + '50'}}></div>
                        <div className="absolute top-[-10px] right-8 w-16 h-[1px]" style={{backgroundColor: !isChristmas ? '#ff0000' : theme.primary + '50'}}></div>
                    </div>
                </div>
            </div>

            {/* --- RIGHT COLUMN --- */}
            <div className="w-72 flex flex-col justify-end gap-4 pointer-events-auto h-full">
                 
                 {/* View Mode Selectors */}
                 <div className="flex flex-col gap-2">
                     <span className="text-[10px] uppercase" style={{color: theme.primaryDark}}>Optical Spectrum</span>
                     <div className="grid grid-cols-3 gap-1">
                        {Object.values(ViewMode).map(mode => {
                            const isActive = viewMode === mode;
                            const modeTheme = mode === ViewMode.THERMAL ? '#ff6600' : (mode === ViewMode.NIGHT_VISION ? '#00ff00' : '#00ffff');
                            return (
                              <button 
                                  key={mode} 
                                  onClick={() => setViewMode(mode)}
                                  className="px-1 py-2 text-[9px] border transition-all"
                                  style={{
                                    backgroundColor: isActive ? modeTheme + '20' : '#00000080',
                                    borderColor: isActive ? modeTheme : theme.primaryDark + '50',
                                    color: isActive ? '#ffffff' : theme.primaryDark,
                                    boxShadow: isActive ? `0 0 10px ${modeTheme}50` : 'none'
                                  }}
                              >
                                  {mode}
                              </button>
                            );
                        })}
                     </div>
                 </div>
                 
                 <HudBox title="SYSTEM DIAGNOSTICS" className="mt-2 text-[10px] border-2" style={{borderColor: theme.primaryDark + '50'}} themeColor={theme.primary} themeDark={theme.primaryDark} themeLight={theme.primaryLight}>
                    <div className="flex justify-between items-center mb-2 pb-2" style={{borderBottom: `1px solid ${theme.primaryDark}30`, color: theme.primaryDark}}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                          SAT UPLINK
                        </span>
                        <span className="text-green-400 font-bold">CONNECTED</span>
                    </div>
                    <div className="flex justify-between items-center mb-2 pb-2" style={{borderBottom: `1px solid ${theme.primaryDark}30`, color: theme.primaryDark}}>
                        <span>LATENCY</span>
                        <span className="font-mono bg-black/40 px-2 py-0.5 border" style={{color: theme.secondary, borderColor: theme.primaryDark + '50'}}>{Math.floor(10 + Math.random() * 5)}ms</span>
                    </div>
                    <div className="flex justify-between items-center mb-2 pb-2" style={{borderBottom: `1px solid ${theme.primaryDark}30`, color: theme.primaryDark}}>
                        <span>ENCRYPTION</span>
                        <span className="font-bold" style={{color: theme.secondary}}>AES-256</span>
                    </div>
                    <div className="flex justify-between items-center mb-2 pb-2" style={{borderBottom: `1px solid ${theme.primaryDark}30`, color: theme.primaryDark}}>
                        <span>SIGNAL STRENGTH</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className="w-1 bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" style={{height: `${i * 3}px`}}></div>
                          ))}
                        </div>
                    </div>
                    <div className="flex justify-between items-center" style={{color: theme.primaryDark}}>
                        <span>CPU LOAD</span>
                        <span className="font-mono" style={{color: theme.secondary}}>47%</span>
                    </div>
                 </HudBox>
            </div>

        </div>
      </div>
    </div>
  );
};

export default App;
