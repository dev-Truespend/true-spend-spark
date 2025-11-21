import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple K-Means++ implementation in TypeScript
interface Point {
  lat: number;
  lng: number;
  amount: number;
  category: string;
}

interface Cluster {
  id: number;
  center_lat: number;
  center_lng: number;
  points: Point[];
}

function distance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  // Haversine distance in meters
  const R = 6371000; // Earth radius in meters
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function kMeansPlusPlus(points: Point[], k: number): Cluster[] {
  if (points.length === 0) return [];
  if (k > points.length) k = points.length;

  const centers: Point[] = [];
  
  // Choose first center randomly
  centers.push(points[Math.floor(Math.random() * points.length)]);

  // Choose remaining centers using K-Means++ initialization
  for (let i = 1; i < k; i++) {
    const distances = points.map(p => {
      const minDist = Math.min(...centers.map(c => distance(p, c)));
      return minDist * minDist; // Square for probability weighting
    });

    const totalDist = distances.reduce((a, b) => a + b, 0);
    const probabilities = distances.map(d => d / totalDist);
    
    // Weighted random selection
    let r = Math.random();
    let cumulative = 0;
    let nextCenter = points[0];
    
    for (let j = 0; j < probabilities.length; j++) {
      cumulative += probabilities[j];
      if (r <= cumulative) {
        nextCenter = points[j];
        break;
      }
    }
    
    centers.push(nextCenter);
  }

  // Lloyd's algorithm iterations
  let clusters: Cluster[] = [];
  let changed = true;
  let iterations = 0;
  const maxIterations = 50;

  while (changed && iterations < maxIterations) {
    // Assign points to nearest center
    clusters = centers.map((center, id) => ({
      id,
      center_lat: center.lat,
      center_lng: center.lng,
      points: [],
    }));

    points.forEach(point => {
      let minDist = Infinity;
      let closestCluster = 0;
      
      centers.forEach((center, idx) => {
        const dist = distance(point, center);
        if (dist < minDist) {
          minDist = dist;
          closestCluster = idx;
        }
      });
      
      clusters[closestCluster].points.push(point);
    });

    // Recalculate centers
    changed = false;
    clusters.forEach((cluster, idx) => {
      if (cluster.points.length === 0) return;
      
      const newLat = cluster.points.reduce((sum, p) => sum + p.lat, 0) / cluster.points.length;
      const newLng = cluster.points.reduce((sum, p) => sum + p.lng, 0) / cluster.points.length;
      
      if (Math.abs(newLat - centers[idx].lat) > 0.0001 || Math.abs(newLng - centers[idx].lng) > 0.0001) {
        changed = true;
        centers[idx] = { ...centers[idx], lat: newLat, lng: newLng };
        cluster.center_lat = newLat;
        cluster.center_lng = newLng;
      }
    });

    iterations++;
  }

  return clusters.filter(c => c.points.length > 0);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { numClusters = 5, minTransactions = 3 } = await req.json();

    // Fetch user's transaction locations
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('location_lat, location_lng, amount, category')
      .eq('user_id', user.id)
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null);

    if (txError) throw txError;

    if (!transactions || transactions.length < minTransactions) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient transaction data',
          message: `Need at least ${minTransactions} transactions with location data`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const points: Point[] = transactions.map(tx => ({
      lat: Number(tx.location_lat),
      lng: Number(tx.location_lng),
      amount: Number(tx.amount),
      category: tx.category,
    }));

    // Run K-Means++ clustering
    const clusters = kMeansPlusPlus(points, numClusters);

    // Calculate cluster statistics and generate suggestions
    const suggestions = clusters.map(cluster => {
      const totalSpent = cluster.points.reduce((sum, p) => sum + p.amount, 0);
      const categories = cluster.points.map(p => p.category);
      const categoryCounts: Record<string, number> = {};
      
      categories.forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const topCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat, count]) => ({ category: cat, count }));

      // Calculate optimal radius (90th percentile of distances from center)
      const distances = cluster.points.map(p => 
        distance({ lat: cluster.center_lat, lng: cluster.center_lng }, p)
      );
      distances.sort((a, b) => a - b);
      const radius = Math.ceil(distances[Math.floor(distances.length * 0.9)] || 500);

      return {
        cluster_id: cluster.id,
        center_lat: cluster.center_lat,
        center_lng: cluster.center_lng,
        radius_meters: Math.max(100, Math.min(radius, 2000)), // Clamp between 100m and 2km
        transaction_count: cluster.points.length,
        total_spent: totalSpent,
        top_categories: topCategories,
        confidence_score: Math.min(0.99, cluster.points.length / 10), // Higher confidence with more data
      };
    });

    // Save suggestions to database
    await Promise.all(
      suggestions.map(suggestion =>
        supabase.from('geofence_suggestions').insert({
          user_id: user.id,
          ...suggestion,
        })
      )
    );

    console.log(`K-Means++ clustering completed for user ${user.id}: ${suggestions.length} geofences suggested`);

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestions,
        message: `Generated ${suggestions.length} geofence suggestions using K-Means++`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('K-Means++ error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
