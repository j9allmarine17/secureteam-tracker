import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CommentSectionProps {
  findingId: number;
}

export default function CommentSection({ findingId }: CommentSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["/api/findings", findingId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/findings/${findingId}/comments`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/findings/${findingId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/findings", findingId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/findings"] });
      setNewComment("");
      toast({
        title: "Success",
        description: "Comment posted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmitComment();
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
        <CardContent className="p-4">
          <div className="text-center text-gray-400">Loading comments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
      <CardHeader>
        <CardTitle className="text-lg text-white">
          Comments ({comments?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Comments */}
        {comments && comments.length > 0 ? (
          comments.map((comment: any) => (
            <div key={comment.id} className="flex space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={comment.user?.profileImageUrl} alt={`${comment.user?.firstName} ${comment.user?.lastName}`} />
                <AvatarFallback className="bg-[hsl(var(--accent-green))] text-[hsl(var(--dark))]">
                  {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-[hsl(var(--dark))] rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium text-white">
                    {comment.user?.firstName} {comment.user?.lastName}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 py-4">
            No comments yet. Be the first to comment!
          </div>
        )}

        {/* Add New Comment */}
        <div className="flex space-x-3 pt-4 border-t border-[hsl(var(--border))]">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.profileImageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
            <AvatarFallback className="bg-[hsl(var(--accent-green))] text-[hsl(var(--dark))]">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyPress}
              className="bg-[hsl(var(--dark))] border-[hsl(var(--border))] text-white placeholder-gray-400 resize-none"
              placeholder="Add a comment... (Ctrl+Enter to post)"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || createCommentMutation.isPending}
                className="bg-[hsl(var(--accent-green))] hover:bg-[hsl(var(--accent-green))]/90 text-[hsl(var(--dark))] font-medium"
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                {createCommentMutation.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
