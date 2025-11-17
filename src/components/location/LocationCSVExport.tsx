import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

interface ExportOptions {
  includeAnalytics: boolean;
  includeHeatmap: boolean;
  includeInsights: boolean;
  includeRecommendations: boolean;
}

export function LocationCSVExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = async (options: ExportOptions) => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const datasets: { name: string; data: any[] }[] = [];

      // Export Location Analytics
      if (options.includeAnalytics) {
        const { data: analytics } = await supabase
          .from('location_analytics')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (analytics) datasets.push({ name: 'Location Analytics', data: analytics });
      }

      // Export Heatmap Data
      if (options.includeHeatmap) {
        const { data: heatmap } = await supabase
          .from('geofence_heatmap_data')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false })
          .limit(1000);
        
        if (heatmap) datasets.push({ name: 'Heatmap Data', data: heatmap });
      }

      // Export Insights
      if (options.includeInsights) {
        const { data: insights } = await supabase
          .from('location_insights')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (insights) datasets.push({ name: 'Insights', data: insights });
      }

      // Export Recommendations
      if (options.includeRecommendations) {
        const { data: recommendations } = await supabase
          .from('location_recommendations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (recommendations) datasets.push({ name: 'Recommendations', data: recommendations });
      }

      // Generate CSV files
      datasets.forEach(({ name, data }) => {
        if (data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => {
              const value = row[header];
              // Handle JSON fields and escape commas
              if (typeof value === 'object' && value !== null) {
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
              }
              return `"${String(value || '').replace(/"/g, '""')}"`;
            }).join(',')
          )
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      toast.success(`Exported ${datasets.length} dataset(s) successfully`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Export Location Data
        </CardTitle>
        <CardDescription>
          Download your location analytics, insights, and recommendations as CSV files
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={() => exportToCSV({
              includeAnalytics: true,
              includeHeatmap: false,
              includeInsights: false,
              includeRecommendations: false,
            })}
            disabled={isExporting}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Analytics Only
          </Button>
          
          <Button
            onClick={() => exportToCSV({
              includeAnalytics: false,
              includeHeatmap: true,
              includeInsights: false,
              includeRecommendations: false,
            })}
            disabled={isExporting}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Heatmap Data
          </Button>
          
          <Button
            onClick={() => exportToCSV({
              includeAnalytics: false,
              includeHeatmap: false,
              includeInsights: true,
              includeRecommendations: false,
            })}
            disabled={isExporting}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Insights Only
          </Button>
          
          <Button
            onClick={() => exportToCSV({
              includeAnalytics: false,
              includeHeatmap: false,
              includeInsights: false,
              includeRecommendations: true,
            })}
            disabled={isExporting}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Recommendations
          </Button>
        </div>

        <Button
          onClick={() => exportToCSV({
            includeAnalytics: true,
            includeHeatmap: true,
            includeInsights: true,
            includeRecommendations: true,
          })}
          disabled={isExporting}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          Export All Data
        </Button>
      </CardContent>
    </Card>
  );
}
