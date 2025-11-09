import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Download, Image as ImageIcon } from 'lucide-react';

export function TimelineImageGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generateTimelineImage = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-timeline-image');

      if (error) throw error;

      if (data.success && data.imageData) {
        setGeneratedImage(data.imageData);
        
        // Download the image
        const link = document.createElement('a');
        link.href = data.imageData;
        link.download = 'truespend-timeline-v4.2.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Timeline Image Generated",
          description: "The image has been generated and downloaded. Add it to public/images/timeline-blueprint-v4.png",
        });
      }
    } catch (error) {
      console.error('Error generating timeline image:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate timeline image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Timeline Image Generator
        </CardTitle>
        <CardDescription>
          Generate a visual timeline diagram for Blueprint v4.2 documentation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={generateTimelineImage} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Timeline...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate & Download Timeline Image
            </>
          )}
        </Button>

        {generatedImage && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Preview:</p>
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={generatedImage} 
                alt="Generated Timeline" 
                className="w-full h-auto"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Save this image as: <code className="bg-muted px-1 py-0.5 rounded">public/images/timeline-blueprint-v4.png</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
