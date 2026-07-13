import React, { useState } from 'react';
import { Camera, Upload, Trash2, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import api from '@/services/api';

const AvatarUploader = ({ currentAvatar, userName, onUpload }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) onUpload(res.data.data.avatar_url);
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed. Max 5MB, images only.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await api.delete('/user/avatar');
      onUpload(null);
    } catch (err) {
      alert('Failed to remove avatar');
    } finally {
      setRemoving(false);
    }
  };

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => !uploading && document.getElementById('avatar-input').click()}
      >
        <Avatar className="h-32 w-32 border-4 border-background ring-2 ring-muted transition-all group-hover:ring-primary/50">
          <AvatarImage src={currentAvatar} alt="Profile Avatar" className="object-cover" />
          <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
            {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : initials}
          </AvatarFallback>
        </Avatar>

        <div className={cn(
          "absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity duration-200",
          isHovered && !uploading && "opacity-100"
        )}>
          <Camera className="h-8 w-8 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
        </div>

        <input
          id="avatar-input"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,image/gif"
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-2"
          disabled={uploading}
          onClick={() => document.getElementById('avatar-input').click()}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        {currentAvatar && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={removing}
            onClick={handleRemove}
          >
            {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Remove
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">JPG, PNG, WebP or GIF · Max 5MB</p>
    </div>
  );
};

export default AvatarUploader;
