
import React from 'react';

interface HudBoxProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
  themeColor?: string;
  themeDark?: string;
  themeLight?: string;
  style?: React.CSSProperties;
}

const HudBox: React.FC<HudBoxProps> = ({ title, children, className = "", accent = true, themeColor = '#00ffff', themeDark = '#0099aa', themeLight = '#44ffff', style = {} }) => {
  return (
    <div className={`bg-[#051a1a]/80 border backdrop-blur-md p-3 relative ${className}`} style={{...style, borderColor: style.borderColor || (themeDark + '60')}}>
         {/* Corner Accents */}
         {accent && (
           <>
             <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t-2 border-l-2" style={{borderColor: themeLight}}></div>
             <div className="absolute -bottom-[1px] -right-[1px] w-2 h-2 border-b-2 border-r-2" style={{borderColor: themeLight}}></div>
           </>
         )}

         {title && (
            <div className="flex items-center gap-2 mb-2 border-b pb-1" style={{borderColor: themeDark + '50'}}>
                <div className="w-1 h-3" style={{backgroundColor: themeColor}}></div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold shadow-black drop-shadow-sm" style={{color: themeLight}}>
                    {title}
                </div>
            </div>
         )}
         
         <div className="font-mono text-sm leading-tight" style={{color: themeLight}}>
            {children}
         </div>
    </div>
  );
};

export default HudBox;
