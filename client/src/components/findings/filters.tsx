import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface FiltersProps {
  filters: {
    severity: string[];
    status: string;
    category: string;
    search: string;
  };
  onFiltersChange: (filters: any) => void;
}

export default function Filters({ filters, onFiltersChange }: FiltersProps) {
  const handleSeverityChange = (severity: string, checked: boolean) => {
    const newSeverities = checked
      ? [...filters.severity, severity]
      : filters.severity.filter(s => s !== severity);
    
    onFiltersChange({ ...filters, severity: newSeverities });
  };

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({ ...filters, status: status === "all" ? "" : status });
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ ...filters, category: category === "all" ? "" : category });
  };

  const clearFilters = () => {
    onFiltersChange({
      severity: [],
      status: "",
      category: "",
      search: "",
    });
  };

  const hasActiveFilters = filters.severity.length > 0 || filters.status || filters.category || filters.search;

  return (
    <Card className="bg-[hsl(var(--primary-bg))] border-[hsl(var(--secondary-bg))]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-gray-400 hover:text-white"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div>
          <Label htmlFor="search" className="text-sm font-medium mb-2 block">Search</Label>
          <div className="relative">
            <Input
              id="search"
              type="text"
              placeholder="Search findings..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))] pl-10 text-white placeholder-gray-400"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Severity Filter */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Severity</Label>
          <div className="space-y-2">
            {[
              { value: 'critical', label: 'Critical', color: 'bg-[hsl(var(--critical))]' },
              { value: 'high', label: 'High', color: 'bg-[hsl(var(--high))]' },
              { value: 'medium', label: 'Medium', color: 'bg-[hsl(var(--medium))]' },
              { value: 'low', label: 'Low', color: 'bg-[hsl(var(--low))]' },
            ].map((severity) => (
              <label key={severity.value} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={filters.severity.includes(severity.value)}
                  onCheckedChange={(checked) => 
                    handleSeverityChange(severity.value, checked as boolean)
                  }
                  className="border-gray-600"
                />
                <span className="flex items-center space-x-2">
                  <span className={`w-3 h-3 rounded-full ${severity.color}`}></span>
                  <span className="text-white">{severity.label}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <Label htmlFor="status" className="text-sm font-medium mb-2 block">Status</Label>
          <Select onValueChange={handleStatusChange} value={filters.status || "all"}>
            <SelectTrigger className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div>
          <Label htmlFor="category" className="text-sm font-medium mb-2 block">Category</Label>
          <Select onValueChange={handleCategoryChange} value={filters.category || "all"}>
            <SelectTrigger className="bg-[hsl(var(--secondary-bg))] border-[hsl(var(--border))]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
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
        </div>

        {/* Report Generation */}
        <div className="pt-4 border-t border-[hsl(var(--secondary-bg))]">
          <Button className="w-full bg-[hsl(var(--purple))] hover:bg-[hsl(var(--purple))]/90 text-white font-medium">
            <span className="mr-2">📄</span>
            Generate Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
