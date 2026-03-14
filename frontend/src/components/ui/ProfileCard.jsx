import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AvatarUploader from './AvatarUploader';

const ProfileCard = ({ profile, onUpdate, loading }) => {
  const [formData, setFormData] = React.useState({
    full_name: profile?.full_name ?? '',
    email: profile?.email ?? '',
    avatar_url: profile?.avatar_url ?? ''
  });

  React.useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name ?? '',
        email: profile.email ?? '',
        avatar_url: profile.avatar_url ?? ''
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpdate = (url) => {
    setFormData(prev => ({ ...prev, avatar_url: url }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdate(formData);
  };

  return (
    <Card className="overflow-hidden border bg-card">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your personal information and public profile details.</CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <AvatarUploader 
                currentAvatar={formData.avatar_url} 
                onUpload={handleAvatarUpdate} 
              />
            </div>
            
            <div className="flex-1 space-y-4 w-full">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input 
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="bg-background"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  className="bg-background"
                />
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="border-t bg-muted/30 px-6 py-4 flex justify-end">
          <Button type="submit" disabled={loading} className="px-8">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving...
              </div>
            ) : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProfileCard;
