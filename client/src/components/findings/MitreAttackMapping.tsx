import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, ExternalLink } from "lucide-react";

interface MitreAttackTechnique {
  id: string;
  name: string;
  description: string;
  tactic: string;
  subTechnique?: string;
  confidence: "low" | "medium" | "high";
  evidence: string[];
}

interface MitreAttackMappingProps {
  value?: {
    techniques: MitreAttackTechnique[];
    killChain: string[];
    iocs: string[];
  };
  onChange: (value: any) => void;
}

export function MitreAttackMapping({ value, onChange }: MitreAttackMappingProps) {
  const [selectedTactic, setSelectedTactic] = useState("");
  const [newTechnique, setNewTechnique] = useState({
    id: "",
    name: "",
    description: "",
    tactic: "",
    subTechnique: "",
    confidence: "medium" as const,
    evidence: []
  });

  const mitreTactics = [
    { id: "TA0001", name: "Initial Access" },
    { id: "TA0002", name: "Execution" },
    { id: "TA0003", name: "Persistence" },
    { id: "TA0004", name: "Privilege Escalation" },
    { id: "TA0005", name: "Defense Evasion" },
    { id: "TA0006", name: "Credential Access" },
    { id: "TA0007", name: "Discovery" },
    { id: "TA0008", name: "Lateral Movement" },
    { id: "TA0009", name: "Collection" },
    { id: "TA0010", name: "Exfiltration" },
    { id: "TA0011", name: "Command and Control" },
    { id: "TA0040", name: "Impact" }
  ];

  const commonTechniques = {
    "TA0001": [
      { id: "T1190", name: "Exploit Public-Facing Application" },
      { id: "T1566", name: "Phishing" },
      { id: "T1078", name: "Valid Accounts" },
      { id: "T1133", name: "External Remote Services" }
    ],
    "TA0002": [
      { id: "T1059", name: "Command and Scripting Interpreter" },
      { id: "T1203", name: "Exploitation for Client Execution" },
      { id: "T1053", name: "Scheduled Task/Job" }
    ],
    "TA0003": [
      { id: "T1543", name: "Create or Modify System Process" },
      { id: "T1546", name: "Event Triggered Execution" },
      { id: "T1547", name: "Boot or Logon Autostart Execution" }
    ],
    "TA0004": [
      { id: "T1068", name: "Exploitation for Privilege Escalation" },
      { id: "T1055", name: "Process Injection" },
      { id: "T1134", name: "Access Token Manipulation" }
    ],
    "TA0008": [
      { id: "T1021", name: "Remote Services" },
      { id: "T1210", name: "Exploitation of Remote Services" },
      { id: "T1563", name: "Remote Service Session Hijacking" }
    ]
  };

  const currentMapping = value || { techniques: [], killChain: [], iocs: [] };

  const addTechnique = () => {
    if (!newTechnique.id || !newTechnique.name) return;

    const updatedTechniques = [...currentMapping.techniques, { ...newTechnique, evidence: [] }];
    onChange({
      ...currentMapping,
      techniques: updatedTechniques
    });

    setNewTechnique({
      id: "",
      name: "",
      description: "",
      tactic: "",
      subTechnique: "",
      confidence: "medium",
      evidence: []
    });
  };

  const removeTechnique = (index: number) => {
    const updatedTechniques = currentMapping.techniques.filter((_, i) => i !== index);
    onChange({
      ...currentMapping,
      techniques: updatedTechniques
    });
  };

  const addToKillChain = (technique: string) => {
    const updatedKillChain = [...currentMapping.killChain, technique];
    onChange({
      ...currentMapping,
      killChain: updatedKillChain
    });
  };

  const selectPresetTechnique = (technique: any) => {
    setNewTechnique({
      ...newTechnique,
      id: technique.id,
      name: technique.name,
      tactic: selectedTactic
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          MITRE ATT&CK Mapping
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("https://attack.mitre.org/", "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            View Framework
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="techniques" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="techniques">Techniques</TabsTrigger>
            <TabsTrigger value="killchain">Kill Chain</TabsTrigger>
            <TabsTrigger value="iocs">IOCs</TabsTrigger>
          </TabsList>

          <TabsContent value="techniques" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tactic</Label>
                  <Select value={selectedTactic} onValueChange={setSelectedTactic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tactic" />
                    </SelectTrigger>
                    <SelectContent>
                      {mitreTactics.map(tactic => (
                        <SelectItem key={tactic.id} value={tactic.id}>
                          {tactic.id} - {tactic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Common Techniques</Label>
                  <Select onValueChange={(value) => {
                    const technique = commonTechniques[selectedTactic as keyof typeof commonTechniques]?.find(t => t.id === value);
                    if (technique) selectPresetTechnique(technique);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technique" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedTactic && commonTechniques[selectedTactic as keyof typeof commonTechniques]?.map(technique => (
                        <SelectItem key={technique.id} value={technique.id}>
                          {technique.id} - {technique.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Technique ID</Label>
                  <Input
                    placeholder="T1190"
                    value={newTechnique.id}
                    onChange={(e) => setNewTechnique({ ...newTechnique, id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Technique Name</Label>
                  <Input
                    placeholder="Exploit Public-Facing Application"
                    value={newTechnique.name}
                    onChange={(e) => setNewTechnique({ ...newTechnique, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe how this technique applies to the finding..."
                  value={newTechnique.description}
                  onChange={(e) => setNewTechnique({ ...newTechnique, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sub-technique</Label>
                  <Input
                    placeholder="T1190.001 (optional)"
                    value={newTechnique.subTechnique}
                    onChange={(e) => setNewTechnique({ ...newTechnique, subTechnique: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confidence</Label>
                  <Select value={newTechnique.confidence} onValueChange={(value: any) => setNewTechnique({ ...newTechnique, confidence: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={addTechnique} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Technique
              </Button>
            </div>

            <div className="space-y-3">
              <Label>Mapped Techniques</Label>
              {currentMapping.techniques.map((technique, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{technique.id}</Badge>
                        <span className="font-medium">{technique.name}</span>
                        <Badge variant={technique.confidence === "high" ? "default" : technique.confidence === "medium" ? "secondary" : "outline"}>
                          {technique.confidence}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{technique.description}</p>
                      {technique.subTechnique && (
                        <Badge variant="outline">{technique.subTechnique}</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTechnique(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="killchain" className="space-y-4">
            <div className="space-y-2">
              <Label>Attack Kill Chain</Label>
              <p className="text-sm text-muted-foreground">
                Map the sequence of techniques used in the attack progression
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {currentMapping.techniques.map((technique, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => addToKillChain(technique.id)}
                  disabled={currentMapping.killChain.includes(technique.id)}
                >
                  {technique.id}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Kill Chain Sequence</Label>
              <div className="flex flex-wrap gap-2">
                {currentMapping.killChain.map((techniqueId, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <Badge>{techniqueId}</Badge>
                    {index < currentMapping.killChain.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="iocs" className="space-y-4">
            <div className="space-y-2">
              <Label>Indicators of Compromise (IOCs)</Label>
              <p className="text-sm text-muted-foreground">
                Add file hashes, IP addresses, domains, or other IOCs related to this finding
              </p>
            </div>
            
            <Textarea
              placeholder="Enter IOCs, one per line..."
              value={currentMapping.iocs.join('\n')}
              onChange={(e) => onChange({
                ...currentMapping,
                iocs: e.target.value.split('\n').filter(line => line.trim())
              })}
              rows={6}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}