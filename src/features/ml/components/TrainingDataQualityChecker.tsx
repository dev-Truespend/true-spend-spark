import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Progress } from "@/shared/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { CheckCircle, XCircle, AlertTriangle, FileCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QualityCheck {
  check_type: string;
  status: "passed" | "warning" | "failed";
  message: string;
  details?: any;
}

interface DataQualityReport {
  file_name: string;
  total_records: number;
  valid_records: number;
  checks: QualityCheck[];
  overall_score: number;
  checked_at: string;
}

export function TrainingDataQualityChecker() {
  const [selectedFile, setSelectedFile] = useState<string>("");

  // Fetch available files
  const { data: files } = useQuery({
    queryKey: ["training-data-files-quality"],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("ml-training-data")
        .list();
      
      if (error) throw error;
      return data;
    },
  });

  // Run quality check mutation
  const qualityCheckMutation = useMutation({
    mutationFn: async (fileName: string): Promise<DataQualityReport> => {
      // Download and analyze the file
      const { data: fileData, error } = await supabase.storage
        .from("ml-training-data")
        .download(fileName);

      if (error || !fileData) {
        throw new Error("Failed to download file for analysis");
      }

      // Parse file content
      const text = await fileData.text();
      let records: any[];
      
      try {
        if (fileName.endsWith('.json')) {
          records = JSON.parse(text);
        } else if (fileName.endsWith('.csv')) {
          // Simple CSV parsing
          const lines = text.split('\n');
          const headers = lines[0].split(',');
          records = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, i) => {
              obj[header.trim()] = values[i]?.trim();
              return obj;
            }, {} as any);
          });
        } else {
          throw new Error("Unsupported file format");
        }
      } catch (e) {
        throw new Error("Failed to parse file: " + (e as Error).message);
      }

      // Run quality checks
      const checks: QualityCheck[] = [];
      let validRecords = 0;

      // Check 1: Schema validation
      if (records.length > 0) {
        const firstRecord = records[0];
        const requiredFields = Object.keys(firstRecord);
        const missingFields = records.filter(r => {
          return !requiredFields.every(field => field in r);
        });

        checks.push({
          check_type: "Schema Validation",
          status: missingFields.length === 0 ? "passed" : "failed",
          message: missingFields.length === 0 
            ? "All records have consistent schema"
            : `${missingFields.length} records missing required fields`,
        });
      }

      // Check 2: Missing values
      const recordsWithMissing = records.filter(r => {
        return Object.values(r).some(v => v === null || v === undefined || v === '');
      });

      checks.push({
        check_type: "Missing Values",
        status: recordsWithMissing.length === 0 ? "passed" : "warning",
        message: recordsWithMissing.length === 0
          ? "No missing values detected"
          : `${recordsWithMissing.length} records contain missing values`,
        details: { count: recordsWithMissing.length, percentage: (recordsWithMissing.length / records.length * 100).toFixed(1) }
      });

      // Check 3: Duplicate detection
      const seen = new Set();
      const duplicates = records.filter(r => {
        const key = JSON.stringify(r);
        if (seen.has(key)) return true;
        seen.add(key);
        return false;
      });

      checks.push({
        check_type: "Duplicate Detection",
        status: duplicates.length === 0 ? "passed" : "warning",
        message: duplicates.length === 0
          ? "No duplicate records found"
          : `${duplicates.length} duplicate records detected`,
        details: { count: duplicates.length }
      });

      // Check 4: Data type validation
      const numericFields = Object.keys(records[0] || {}).filter(key => {
        const value = records[0]?.[key];
        return !isNaN(parseFloat(value));
      });

      const invalidTypes = records.filter(r => {
        return numericFields.some(field => {
          const value = r[field];
          return value !== null && value !== undefined && value !== '' && isNaN(parseFloat(value));
        });
      });

      checks.push({
        check_type: "Data Type Validation",
        status: invalidTypes.length === 0 ? "passed" : "failed",
        message: invalidTypes.length === 0
          ? "All data types are valid"
          : `${invalidTypes.length} records have invalid data types`,
      });

      // Check 5: Outlier detection (simple)
      if (numericFields.length > 0) {
        const field = numericFields[0];
        const values = records.map(r => parseFloat(r[field])).filter(v => !isNaN(v));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
        const outliers = values.filter(v => Math.abs(v - mean) > 3 * std);

        checks.push({
          check_type: "Outlier Detection",
          status: outliers.length < values.length * 0.05 ? "passed" : "warning",
          message: `${outliers.length} potential outliers detected (${(outliers.length / values.length * 100).toFixed(1)}%)`,
          details: { count: outliers.length, field }
        });
      }

      // Calculate overall score
      const passedChecks = checks.filter(c => c.status === "passed").length;
      const overallScore = (passedChecks / checks.length) * 100;

      validRecords = records.length - recordsWithMissing.length - invalidTypes.length;

      return {
        file_name: fileName,
        total_records: records.length,
        valid_records: validRecords,
        checks,
        overall_score: overallScore,
        checked_at: new Date().toISOString(),
      };
    },
    onSuccess: (report) => {
      toast.success(`Quality check complete! Score: ${Math.round(report.overall_score)}%`);
    },
    onError: (error) => {
      toast.error(`Quality check failed: ${(error as Error).message}`);
    },
  });

  const getCheckIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Quality Checks</h2>
        <p className="text-muted-foreground">Validate training data before starting ML jobs</p>
      </div>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Training Data File</CardTitle>
          <CardDescription>Choose a file to analyze for quality issues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a file to check" />
              </SelectTrigger>
              <SelectContent>
                {files?.map((file) => (
                  <SelectItem key={file.id} value={file.name}>
                    {file.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => qualityCheckMutation.mutate(selectedFile)}
              disabled={!selectedFile || qualityCheckMutation.isPending}
            >
              {qualityCheckMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Run Quality Check
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quality Report */}
      {qualityCheckMutation.data && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Quality Report</CardTitle>
                <CardDescription>{qualityCheckMutation.data.file_name}</CardDescription>
              </div>
              <Badge
                variant={qualityCheckMutation.data.overall_score >= 80 ? "default" : "destructive"}
                className="text-lg px-4 py-1"
              >
                {Math.round(qualityCheckMutation.data.overall_score)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{qualityCheckMutation.data.total_records.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Valid Records</p>
                <p className="text-2xl font-bold text-green-500">
                  {qualityCheckMutation.data.valid_records.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Overall Score Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Quality Score</span>
                <span className="font-medium">{Math.round(qualityCheckMutation.data.overall_score)}%</span>
              </div>
              <Progress value={qualityCheckMutation.data.overall_score} />
            </div>

            {/* Quality Checks */}
            <div className="space-y-3">
              <h3 className="font-semibold">Quality Checks</h3>
              {qualityCheckMutation.data.checks.map((check, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-0.5">{getCheckIcon(check.status)}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{check.check_type}</p>
                    <p className="text-sm text-muted-foreground">{check.message}</p>
                    {check.details && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {JSON.stringify(check.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {qualityCheckMutation.data.overall_score < 80 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Quality Score Below Threshold</AlertTitle>
                <AlertDescription>
                  This dataset has quality issues that may affect model performance. Consider cleaning the data before training.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}