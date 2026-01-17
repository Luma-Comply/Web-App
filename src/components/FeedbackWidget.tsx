'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, Loader2, Bug, Lightbulb, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type FeedbackType = 'bug' | 'feature' | 'general';

interface FeedbackWidgetProps {
    user?: { id: string; email?: string; name?: string; };
}

export function FeedbackWidget({ user: propUser }: FeedbackWidgetProps) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const [type, setType] = useState<FeedbackType>('bug');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [user, setUser] = useState(propUser);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check if user is logged in - only show widget for authenticated users
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setIsAuthenticated(true);
                if (!propUser) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                    });
                } else {
                    setUser(propUser);
                }
            } else {
                setIsAuthenticated(false);
            }
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthenticated(!!session?.user);
            if (session?.user && !propUser) {
                setUser({
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                });
            }
        });

        return () => subscription.unsubscribe();
    }, [propUser]);

    const getTypeIcon = (t: FeedbackType) => {
        switch (t) {
            case 'bug': return <Bug className="h-4 w-4" />;
            case 'feature': return <Lightbulb className="h-4 w-4" />;
            case 'general': return <MessageCircle className="h-4 w-4" />;
        }
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            toast({
                title: 'Error',
                description: 'Please enter a description',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    description,
                    userEmail: user?.email,
                    userId: user?.id,
                    userName: user?.name || 'Anonymous',
                    path: pathname,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to submit');
            }

            toast({
                title: 'Success',
                description: 'Feedback sent! Thank you.',
            });

            setOpen(false);
            setDescription('');
            setType('bug');
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Something went wrong. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Don't render if user is not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    size="icon"
                    className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-coral hover:bg-coral/90 text-white"
                >
                    <MessageSquare className="h-6 w-6" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Send Feedback</DialogTitle>
                    <DialogDescription>Help us improve Luma.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Feedback Type</Label>
                        <div className="flex gap-2">
                            {(['bug', 'feature', 'general'] as FeedbackType[]).map((t) => {
                                const isSelected = type === t;
                                const isBug = t === 'bug';
                                
                                return (
                                    <Button
                                        key={t}
                                        type="button"
                                        variant={isSelected ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setType(t)}
                                        className={cn(
                                            "flex-1 capitalize",
                                            isSelected && isBug && "ring-2 ring-coral bg-coral text-white hover:bg-coral/90",
                                            isSelected && !isBug && "ring-2 ring-mint bg-mint text-white hover:bg-mint/90"
                                        )}
                                    >
                                        <span className="mr-2">{getTypeIcon(t)}</span>
                                        {t}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[120px]"
                            placeholder="Tell us what you think..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            'Send'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
