import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🧪 Testing external connectivity...');
    
    // Test basic internet connectivity
    const testUrls = [
      'https://httpbin.org/get',
      'https://jsonplaceholder.typicode.com/posts/1',
      'https://api.github.com/zen'
    ];
    
    const results = [];
    
    for (const url of testUrls) {
      try {
        console.log(`🔍 Testing: ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Test App)',
          },
          signal: AbortSignal.timeout(5000)
        });
        
        results.push({
          url,
          status: response.status,
          success: response.ok,
          error: null
        });
        
        console.log(`✅ ${url}: ${response.status}`);
      } catch (error) {
        results.push({
          url,
          status: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.log(`❌ ${url}: ${error}`);
      }
    }
    
    // Test NHL API specifically
    const nhlUrls = [
      'https://statsapi.web.nhl.com/api/v1/teams',
      'https://statsapi.nhle.com/api/v1/teams',
      'https://api.nhle.com/api/v1/teams'
    ];
    
    const nhlResults = [];
    
    for (const url of nhlUrls) {
      try {
        console.log(`🏒 Testing NHL API: ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; NHL Test App)',
          },
          signal: AbortSignal.timeout(10000)
        });
        
        nhlResults.push({
          url,
          status: response.status,
          success: response.ok,
          error: null,
          contentType: response.headers.get('content-type')
        });
        
        console.log(`✅ NHL API ${url}: ${response.status}`);
      } catch (error) {
        nhlResults.push({
          url,
          status: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        console.log(`❌ NHL API ${url}: ${error}`);
      }
    }
    
    return NextResponse.json({
      generalConnectivity: results,
      nhlApiConnectivity: nhlResults,
      summary: {
        generalWorking: results.some(r => r.success),
        nhlWorking: nhlResults.some(r => r.success),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('💥 Connectivity test failed:', error);
    
    return NextResponse.json({
      error: 'Connectivity test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
