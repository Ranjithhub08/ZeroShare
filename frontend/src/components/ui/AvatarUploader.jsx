import React, { useState } from 'react';
import { Camera, Upload, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const AvatarUploader = ({ currentAvatar, onUpload }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Simulation of upload
      const fakeUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`;
      onUpload(fakeUrl);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        className="relative group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => document.getElementById('avatar-input').click()}
      >
        <Avatar className="h-32 w-32 border-4 border-background ring-2 ring-muted transition-all group-hover:ring-primary/50">
          <AvatarImage src={currentAvatar} alt="Profile Avatar" className="object-cover" />
          <AvatarFallback className="bg-muted">
            <User className="h-12 w-12 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        
        <div className={cn(
          "absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity duration-200",
          isHovered && "opacity-100"
        )}>
          <Camera className="h-8 w-8 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
        </div>
        
        <input 
          id="avatar-input"
          type="file" 
          className="hidden" 
          onChange={handleFileChange} 
          accept="image/*" 
        />
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-xs gap-2"
          onClick={() => document.getElementById('avatar-input').click()}
        >
          <Upload className="h-3.5 w-3.5" /> 
          Upload
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 text-xs gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> 
          Remove
        </Button>
      </div>
    </div>
  );
};

export default AvatarUploader;
