import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/shared/hooks/use-toast';
import { Search, Loader2, DollarSign, Calendar, Tag } from 'lucide-react';

interface SearchResult {
  id: string;
  merchant_name: string;
  amount: number;
  category: string;
  timestamp: string;
  description?: string;
  distance?: number;
}

export function SemanticSearchBar() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [avgSimilarity, setAvgSimilarity] = useState(0);
  const [searchMethod, setSearchMethod] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Empty Query',
        description: 'Please enter a search query',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search-transactions', {
        body: {
          query: query.trim(),
          limit: 10,
          threshold: 0.3,
        },
      });

      if (error) throw error;

      setResults(data.results || []);
      setAvgSimilarity(data.avg_similarity || 0);
      setSearchMethod(data.method || 'unknown');
      
      toast({
        title: 'Search Complete',
        description: `Found ${data.count} transactions matching "${query}"`,
      });
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: 'Search Failed',
        description: error.message || 'Failed to search transactions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <CardTitle>Semantic Transaction Search</CardTitle>
        </div>
        <CardDescription>
          Search transactions using natural language powered by HuggingFace embeddings and pgvector
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., 'coffee shops near work' or 'expensive dinners last month'"
            disabled={loading}
          />
          <Button 
            onClick={handleSearch} 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {searchMethod && (
          <div className="flex items-center gap-2">
            <Badge variant={searchMethod === 'semantic_search' ? 'default' : 'secondary'}>
              {searchMethod === 'semantic_search' ? '🤖 AI Semantic Search' : '📝 Text Search'}
            </Badge>
            {avgSimilarity > 0 && (
              <Badge variant="outline">
                {(avgSimilarity * 100).toFixed(1)}% avg similarity
              </Badge>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{results.length} Results</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.map((result) => (
                <div key={result.id} className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.merchant_name}</span>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-semibold">{result.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {result.description && (
                    <p className="text-sm text-muted-foreground">{result.description}</p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span>{result.category}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(result.timestamp).toLocaleDateString()}</span>
                    </div>
                    {result.distance !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {((1 - result.distance) * 100).toFixed(1)}% match
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && query && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found matching your query
          </div>
        )}
      </CardContent>
    </Card>
  );
}
