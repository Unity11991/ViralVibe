import React, { useState } from 'react';
import { Instagram, Music, Twitter, Heart, MessageCircle, Share2, Repeat, Bookmark, MoreHorizontal } from 'lucide-react';

const SocialPreview = ({ image, captions, hashtags, user }) => {
  const [activeTab, setActiveTab] = useState('instagram');
  const [liked, setLiked] = useState(false);

  const username = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "govyral_user";
  const displayImage = image ? URL.createObjectURL(image) : null;
  const captionText = captions && captions.length > 0 ? captions[0] : "Check out my new vibe! #govyral";
  const hashtagText = hashtags ? hashtags.join(' ') : "#viral #trending";

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-white/10 mt-6 backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-indigo-400">👁️</span> Social Preview
      </h3>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['instagram', 'tiktok', 'twitter'].map((platform) => (
          <button
            key={platform}
            onClick={() => setActiveTab(platform)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === platform
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </button>
        ))}
      </div>

      {/* Preview Container */}
      <div className="flex justify-center">
        <div className="w-[320px] bg-black rounded-[2rem] border-[8px] border-gray-900 overflow-hidden shadow-2xl relative">
          
          {/* Status Bar Mock */}
          <div className="h-6 bg-black flex justify-between items-center px-4 text-[10px] text-white font-medium select-none z-20 relative">
            <span>9:41</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-white/20 rounded-full"></div>
              <div className="w-3 h-3 bg-white/20 rounded-full"></div>
            </div>
          </div>

          {/* --- INSTAGRAM --- */}
          {activeTab === 'instagram' && (
            <div className="bg-black h-full flex flex-col">
              {/* Header */}
              <div className="h-12 flex items-center justify-between px-3 border-b border-white/10">
                <span className="text-white font-semibold text-sm">govyral</span>
                <MoreHorizontal className="w-5 h-5 text-white" />
              </div>

              {/* Image */}
              <div className="aspect-square bg-gray-900 relative">
                {displayImage && (
                  <img src={displayImage} alt="Post" className="w-full h-full object-cover" />
                )}
              </div>

              {/* Actions */}
              <div className="p-3">
                <div className="flex justify-between mb-2">
                  <div className="flex gap-4">
                    <Heart 
                      className={`w-6 h-6 cursor-pointer transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} 
                      onClick={() => setLiked(!liked)}
                    />
                    <MessageCircle className="w-6 h-6 text-white" />
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <Bookmark className="w-6 h-6 text-white" />
                </div>
                
                <div className="text-white text-sm font-bold mb-1">1,234 likes</div>
                <div className="text-white text-sm">
                  <span className="font-bold mr-2">{username}</span>
                  {captionText} <span className="text-blue-400">{hashtagText}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">View all 42 comments</div>
              </div>
            </div>
          )}

          {/* --- TIKTOK --- */}
          {activeTab === 'tiktok' && (
            <div className="bg-black h-[550px] relative">
              {displayImage && (
                 <img src={displayImage} alt="Post" className="w-full h-full object-cover opacity-80" />
              )}
              
              {/* Overlay UI */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent pt-20">
                <div className="text-white font-bold mb-2">@{username}</div>
                <div className="text-white text-sm mb-4 line-clamp-2">
                  {captionText} {hashtagText}
                </div>
                <div className="flex items-center gap-2 text-white text-sm">
                  <Music className="w-4 h-4" />
                  <span>Original Sound - {username}</span>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="absolute right-2 bottom-20 flex flex-col gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-indigo-600 border border-white flex items-center justify-center text-xs font-bold text-white">
                  {username[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Heart className="w-8 h-8 text-white fill-white/20" />
                  <span className="text-white text-xs font-bold">12k</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <MessageCircle className="w-8 h-8 text-white fill-white/20" />
                  <span className="text-white text-xs font-bold">482</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Share2 className="w-8 h-8 text-white fill-white/20" />
                  <span className="text-white text-xs font-bold">Share</span>
                </div>
              </div>
            </div>
          )}

          {/* --- TWITTER --- */}
          {activeTab === 'twitter' && (
             <div className="bg-black h-full p-4">
                <div className="flex gap-3">
                   <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0"></div>
                   <div className="flex-1">
                      <div className="flex items-center gap-1 mb-1">
                         <span className="text-white font-bold text-sm">{username}</span>
                         <span className="text-gray-500 text-sm">@govyral_user · 1h</span>
                      </div>
                      <div className="text-white text-sm mb-3">
                         {captionText} <br/> <span className="text-blue-400">{hashtagText}</span>
                      </div>
                      
                      {displayImage && (
                        <div className="rounded-xl overflow-hidden border border-gray-800 mb-3">
                           <img src={displayImage} alt="Post" className="w-full h-48 object-cover" />
                        </div>
                      )}

                      <div className="flex justify-between text-gray-500 max-w-[80%]">
                         <MessageCircle className="w-4 h-4 hover:text-blue-400" />
                         <Repeat className="w-4 h-4 hover:text-green-400" />
                         <Heart className="w-4 h-4 hover:text-pink-500" />
                         <Share2 className="w-4 h-4 hover:text-blue-400" />
                      </div>
                   </div>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SocialPreview;
