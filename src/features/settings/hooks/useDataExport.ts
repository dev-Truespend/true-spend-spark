import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportUserData = async () => {
    setIsExporting(true);
    
    try {
      toast.loading("Preparing your data export...", { id: "data-export" });
      
      const { data, error } = await supabase.functions.invoke('data-export-request', {
        method: 'POST'
      });
      
      if (error) {
        console.error('Export error:', error);
        throw error;
      }
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truespend-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Data export complete! Check your downloads folder.", { id: "data-export" });
      
      return data;
    } catch (error) {
      console.error('Export failed:', error);
      toast.error("Failed to export data. Please try again.", { id: "data-export" });
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  return { 
    exportUserData, 
    isExporting 
  };
};
