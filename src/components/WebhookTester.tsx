import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Send, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PaymentFlowTester } from './PaymentFlowTester';

interface WebhookLog {
  id?: string;
  created_at?: string;
  timestamp?: string;
  headers: any;
  payload?: any;
  body?: any;
}

export function WebhookTester() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/payments/webhook-logs');
      if (response.ok) {
        const data = await response.json();
        // Map data if necessary, or ensure backend returns expected format
        // Backend returns: { created_at, payload, headers }
        // If backend returns old format (from memory), handle that too?
        // No, we are switching to Supabase.
        setLogs(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch logs:', response.statusText);
        // Don't toast on every poll error to avoid spamming
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateWebhook = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch('/api/payments/simulate-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Webhook simulated successfully!');
        fetchLogs(); // Refresh logs
      } else {
        toast.error('Failed to simulate webhook: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error simulating webhook:', error);
      toast.error('Error simulating webhook');
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">InfinitePay Webhook Tester</h1>
          <div className="flex gap-3">
            <Button 
              onClick={fetchLogs} 
              variant="outline" 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Logs
            </Button>
            <Button 
              onClick={simulateWebhook} 
              disabled={isSimulating}
              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Simulate Webhook (Ping)
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                Webhook Endpoint Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>URL:</strong> {window.location.origin}/api/payments/webhook</p>
                <p><strong>Method:</strong> POST</p>
                <p className="text-gray-500">
                  Configure this URL in your InfinitePay dashboard to receive real payment notifications.
                  Ensure you have set the <code>INFINITEPAY_WEBHOOK_SECRET</code> environment variable for security.
                </p>
              </div>
            </CardContent>
          </Card>

          <PaymentFlowTester />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Webhook Logs</span>
                <span className="text-sm font-normal text-gray-500">{logs.length} entries</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No webhook logs found yet. Try simulating one!
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-mono text-gray-500">
                          {new Date(log.timestamp || log.created_at || new Date().toISOString()).toLocaleString()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (log.body?.status || log.body?.data?.status || log.payload?.status) === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {log.body?.status || log.body?.data?.status || log.payload?.status || 'unknown'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Payload</h4>
                          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(log.body || log.payload, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Headers</h4>
                          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(log.headers, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
