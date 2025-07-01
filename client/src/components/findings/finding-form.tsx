import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { MitreAttackMapping } from "./MitreAttackMapping";

interface FindingFormProps {
  finding?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FindingForm({ finding, onClose, onSuccess }: FindingFormProps) {
  const { toast } = useToast();
  const isEditing = !!finding;
  const [selectedUsers, setSelectedUsers] = useState<string[]>(finding?.assignedTo || []);
  const [mitreMapping, setMitreMapping] = useState(finding?.mitreAttack || { techniques: [], killChain: [], iocs: [] });
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      title: finding?.title || "",
      description: finding?.description || "",
      severity: finding?.severity || "",
      category: finding?.category || "",
      status: finding?.status || "open",
      cvssScore: finding?.cvssScore || "",
      affectedUrl: finding?.affectedUrl || "",
      payload: finding?.payload || "",
      assignedTo: finding?.assignedTo || [] as string[],
    },
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const userList = Array.isArray(users) ? users : [];

  const handleUserToggle = (userId: string) => {
    const newSelectedUsers = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    setSelectedUsers(newSelectedUsers);
    setValue("assignedTo", newSelectedUsers);
  };

  const removeUser = (userId: string) => {
    const newSelectedUsers = selectedUsers.filter(id => id !== userId);
    setSelectedUsers(newSelectedUsers);
    setValue("assignedTo", newSelectedUsers);
  };

  const saveFindingMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log("Attempting to save finding:", data);
        const response = isEditing
          ? await apiRequest("PUT", `/api/findings/${finding.id}`, data)
          : await apiRequest("POST", "/api/findings", data);
        console.log(`Finding ${isEditing ? 'update' : 'creation'} successful:`, response);
        return response;
      } catch (error) {
        console.error(`Finding ${isEditing ? 'update' : 'creation'} failed:`, error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Finding created successfully, invalidating queries");
      queryClient.invalidateQueries({ queryKey: ["/api/findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: isEditing ? "Finding updated successfully" : "Finding created successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Finding creation error details:", {
        message: error.message,
        stack: error.stack,
        cause: error.cause,
        name: error.name
      });
      
      toast({
        title: isEditing ? "Error Updating Finding" : "Error Creating Finding",
        description: `${error.message} - Check browser console for details`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (!data.title || !data.description || !data.severity || !data.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Title, Description, Severity, Category)",
        variant: "destructive",
      });
      return;
    }

    const formattedData = {
      title: data.title.trim(),
      description: data.description.trim(),
      severity: data.severity,
      category: data.category,
      status: data.status || "open",
      cvssScore: data.cvssScore ? data.cvssScore.trim() : null,
      affectedUrl: data.affectedUrl ? data.affectedUrl.trim() : null,
      payload: data.payload ? data.payload.trim() : null,
      assignedTo: data.assignedTo || [],
      mitreAttack: mitreMapping,
    };
    
    console.log("Submitting finding data:", formattedData);
    saveFindingMutation.mutate(formattedData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))] max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Finding' : 'Create New Finding'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Finding Details</TabsTrigger>
              <TabsTrigger value="mitre">MITRE ATT&CK</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register("title", { required: "Title is required" })}
                  className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]"
                  placeholder="SQL Injection in Login Form"
                />
                {errors.title && (
                  <p className="text-red-400 text-sm mt-1">{String(errors.title.message)}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="severity">Severity *</Label>
                  <Select onValueChange={(value) => setValue("severity", value)} value={watch("severity")}>
                    <SelectTrigger className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.severity && (
                    <p className="text-red-400 text-sm mt-1">Severity is required</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select onValueChange={(value) => setValue("category", value)} value={watch("category")}>
                    <SelectTrigger className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web_application">Web Application</SelectItem>
                      <SelectItem value="network">Network</SelectItem>
                      <SelectItem value="infrastructure">Infrastructure</SelectItem>
                      <SelectItem value="social_engineering">Social Engineering</SelectItem>
                      <SelectItem value="indicator_of_compromise">Indicator of Compromise</SelectItem>
                      <SelectItem value="malware">Malware</SelectItem>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="network_traffic">Network Traffic</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-red-400 text-sm mt-1">Category is required</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cvssScore">CVSS Score</Label>
                  <Input
                    id="cvssScore"
                    {...register("cvssScore")}
                    className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]"
                    placeholder="7.5"
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(value) => setValue("status", value)} value={watch("status")}>
                    <SelectTrigger className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="affectedUrl">Affected URL</Label>
                <Input
                  id="affectedUrl"
                  {...register("affectedUrl")}
                  className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]"
                  placeholder="https://example.com/login"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  {...register("description", { required: "Description is required" })}
                  className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]"
                  placeholder="Detailed description of the security finding..."
                  rows={4}
                />
                {errors.description && (
                  <p className="text-red-400 text-sm mt-1">{String(errors.description.message)}</p>
                )}
              </div>

              <div>
                <Label htmlFor="payload">Payload/Proof of Concept</Label>
                <Textarea
                  id="payload"
                  {...register("payload")}
                  className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))] font-mono"
                  placeholder="admin' OR '1'='1' --"
                  rows={3}
                />
              </div>

              <div>
                <Label>Assigned To</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {userList.map((user: any) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={user.id}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={user.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <Label htmlFor={user.id} className="text-sm">
                        {user.firstName} {user.lastName} ({user.role})
                      </Label>
                    </div>
                  ))}
                </div>
                
                {selectedUsers.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((userId) => {
                        const user = userList.find((u: any) => u.id === userId);
                        return user ? (
                          <div key={userId} className="flex items-center space-x-1 bg-[hsl(var(--secondary-bg))] px-2 py-1 rounded-md">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={user.profileImageUrl} />
                              <AvatarFallback className="text-xs">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user.firstName} {user.lastName}</span>
                            <button
                              type="button"
                              onClick={() => removeUser(userId)}
                              className="text-gray-400 hover:text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="mitre" className="space-y-4 mt-4">
              <MitreAttackMapping
                value={mitreMapping}
                onChange={setMitreMapping}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveFindingMutation.isPending}
              className="bg-[hsl(var(--accent-green))] hover:bg-[hsl(var(--accent-green))]/90 text-[hsl(var(--dark))]"
            >
              {saveFindingMutation.isPending ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Finding" : "Create Finding")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}