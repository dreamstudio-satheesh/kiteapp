

import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import { 
  Button, Input, Select, FileInput, Table, Modal, LoadingSpinner, Card, PageTitle, ToggleSwitch, Textarea
} from './components';
import { 
  apiFetch, useAuth, useToast, useWebSocket 
} from './services';
import { 
  API_ENDPOINTS, ZERODHA_ACCOUNT_STATUS_OPTIONS, BUY_LOGIC_OPTIONS, 
  ORDER_STATUS_OPTIONS, CRON_LOG_JOB_NAME_OPTIONS, CRON_LOG_STATUS_OPTIONS
} from './constants';
import { 
  ZerodhaAccount, AdminSettings, OrderResponse, WatchlistItem, GTTOrder, CronLog, 
  Position, ZerodhaAccountStatus, BuyLogic, ColumnDefinition, OrderMonitorStatus, BackendServiceStatus, TickData, ToastType 
} from './types';

// --- LoginPage ---
export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin'); // Default for easy testing
  const [password, setPassword] = useState('admin123'); // Default for easy testing
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const { addToast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      // FIX: Use ToastType enum member for type safety
      addToast('Login successful!', ToastType.SUCCESS);
      // Navigation will be handled by ProtectedRoute
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      // FIX: Use ToastType enum member for type safety
      addToast(err.message || 'Login failed', ToastType.ERROR);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-10 bg-white shadow-xl rounded-xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Admin Panel
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <Input
            id="username"
            label="Username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={error && !password ? error : undefined} // Show general error on username field if password is not also involved
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error && password ? error : undefined}
          />
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          <div>
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- DashboardHomePage ---
export const DashboardHomePage: React.FC = () => {
  const { user } = useAuth();
  const { isTicksConnected, isOrdersConnected } = useWebSocket();
  const [backendHealth, setBackendHealth] = useState<BackendServiceStatus[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const { addToast } = useToast();

  const fetchBackendHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      // This is an assumed endpoint. Replace if actual endpoint is different.
      const healthData = await apiFetch<BackendServiceStatus[]>(API_ENDPOINTS.BACKEND_HEALTH);
      setBackendHealth(healthData);
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to fetch backend health: ${error.message}`, ToastType.ERROR);
      setBackendHealth([]); // Clear or set to error state
    } finally {
      setLoadingHealth(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBackendHealth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const getStatusColor = (status: string) => {
    if (status === 'operational') return 'text-green-500';
    if (status === 'degraded') return 'text-yellow-500';
    if (status === 'down') return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div>
      <PageTitle title={`Welcome, ${user?.username || 'Admin'}!`} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="WebSocket Status">
            <p>Ticks WebSocket: <span className={isTicksConnected ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold'}>{isTicksConnected ? 'Connected' : 'Disconnected'}</span></p>
            <p>Orders WebSocket: <span className={isOrdersConnected ? 'text-green-500 font-semibold' : 'text-red-500 font-semibold'}>{isOrdersConnected ? 'Connected' : 'Disconnected'}</span></p>
        </Card>
        <Card title="Backend Services Health">
          {loadingHealth ? <LoadingSpinner /> : (
            backendHealth.length > 0 ? (
              <ul className="space-y-1">
                {backendHealth.map(service => (
                  <li key={service.service_name} className="flex justify-between">
                    <span>{service.service_name}:</span>
                    <span className={`${getStatusColor(service.status)} font-semibold`}>{service.status}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-500">Health status not available.</p>
          )}
        </Card>
         <Card title="Quick Stats (Placeholder)">
            <p>Total Active Accounts: <span className="font-semibold">N/A</span></p>
            <p>Pending Orders: <span className="font-semibold">N/A</span></p>
            <p>Open Positions: <span className="font-semibold">N/A</span></p>
        </Card>
      </div>
      <Card title="Overview" className="mt-6">
        <p className="text-gray-700">
          This is the central hub for managing your Zerodha trading operations. 
          Use the sidebar to navigate through different sections like Accounts, Settings, Orders, and more.
          Real-time data updates for positions and watchlists are available through WebSocket connections.
        </p>
      </Card>
    </div>
  );
};


// --- AccountsPage ---
export const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<ZerodhaAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ZerodhaAccount | null>(null);
  const { addToast } = useToast();

  const initialFormState: ZerodhaAccount = { name: '', api_key: '', api_secret: '', access_token: '', status: ZerodhaAccountStatus.ACTIVE };
  const [formData, setFormData] = useState<ZerodhaAccount>(initialFormState);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<ZerodhaAccount[]>(API_ENDPOINTS.ZERODHA_ACCOUNTS);
      setAccounts(data);
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to fetch accounts: ${error.message}`, ToastType.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleToggleChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, status: checked ? ZerodhaAccountStatus.ACTIVE : ZerodhaAccountStatus.INACTIVE }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingAccount && editingAccount.id) {
        await apiFetch<ZerodhaAccount>(`${API_ENDPOINTS.ZERODHA_ACCOUNTS}/${editingAccount.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        // FIX: Use ToastType enum member for type safety
        addToast('Account updated successfully!', ToastType.SUCCESS);
      } else {
        await apiFetch<ZerodhaAccount>(API_ENDPOINTS.ZERODHA_ACCOUNTS, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        // FIX: Use ToastType enum member for type safety
        addToast('Account added successfully!', ToastType.SUCCESS);
      }
      fetchAccounts();
      closeModal();
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to save account: ${error.message}`, ToastType.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (account: ZerodhaAccount | null = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData(account);
    } else {
      setEditingAccount(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setFormData(initialFormState);
  };

  const handleDelete = async (account: ZerodhaAccount) => {
    if (window.confirm(`Are you sure you want to delete account "${account.name}"?`) && account.id) {
      setIsLoading(true);
      try {
        await apiFetch<void>(`${API_ENDPOINTS.ZERODHA_ACCOUNTS}/${account.id}`, { method: 'DELETE' });
        // FIX: Use ToastType enum member for type safety
        addToast('Account deleted successfully!', ToastType.SUCCESS);
        fetchAccounts();
      } catch (error: any) {
        // FIX: Use ToastType enum member for type safety
        addToast(`Failed to delete account: ${error.message}`, ToastType.ERROR);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const columns: ColumnDefinition<ZerodhaAccount, keyof ZerodhaAccount>[] = [
    { key: 'name', header: 'Name' },
    { key: 'api_key', header: 'API Key' },
    { key: 'status', header: 'Status', render: (item) => <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === ZerodhaAccountStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.status}</span> },
  ];

  return (
    <div>
      <PageTitle title="Zerodha Accounts Management" actions={
        <Button onClick={() => openModal()} variant="primary">Add Account</Button>
      }/>
      <Table<ZerodhaAccount>
        columns={columns}
        data={accounts}
        isLoading={isLoading}
        onEdit={openModal}
        onDelete={handleDelete}
      />
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAccount ? 'Edit Account' : 'Add Account'}>
        <form onSubmit={handleSubmit}>
          <Input name="name" label="Name" value={formData.name} onChange={handleInputChange} required />
          <Input name="api_key" label="API Key" value={formData.api_key} onChange={handleInputChange} required />
          <Input name="api_secret" label="API Secret" type="password" value={formData.api_secret} onChange={handleInputChange} required />
          <Input name="access_token" label="Access Token" type="password" value={formData.access_token} onChange={handleInputChange} required />
          <ToggleSwitch
            id="status"
            label="Status"
            checked={formData.status === ZerodhaAccountStatus.ACTIVE}
            onChange={handleToggleChange}
          />
          <div className="mt-6 flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>Save Account</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


// --- AdminSettingsPage ---
export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const initialFormState: AdminSettings = { buy_logic: BuyLogic.FIXED_PERCENT, buy_percent: 0, stoploss_percent: 0, auto_sell_cutoff: '15:20:00' };

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<AdminSettings>(API_ENDPOINTS.ADMIN_SETTINGS);
      setSettings(data);
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to fetch settings: ${error.message}`, ToastType.ERROR);
      setSettings(initialFormState); // Fallback to initial if fetch fails
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) : value;
    setSettings(prev => prev ? { ...prev, [name]: val } : null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsLoading(true);
    try {
      await apiFetch<AdminSettings>(API_ENDPOINTS.ADMIN_SETTINGS, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      // FIX: Use ToastType enum member for type safety
      addToast('Settings updated successfully!', ToastType.SUCCESS);
      fetchSettings();
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to update settings: ${error.message}`, ToastType.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !settings) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  if (!settings) return <Card title="Admin Settings"><p>Could not load settings.</p></Card>;

  return (
    <div>
      <PageTitle title="Global Admin Settings"/>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            name="buy_logic"
            label="Buy Logic"
            value={settings.buy_logic}
            onChange={handleInputChange}
            options={BUY_LOGIC_OPTIONS}
            required
          />
          <Input
            name="buy_percent"
            label="Buy % (e.g., 1 for 1%)"
            type="number"
            step="0.01"
            value={settings.buy_percent}
            onChange={handleInputChange}
            required
          />
          <Input
            name="stoploss_percent"
            label="Stoploss % (e.g., 0.5 for 0.5%)"
            type="number"
            step="0.01"
            value={settings.stoploss_percent}
            onChange={handleInputChange}
            required
          />
          <Input
            name="auto_sell_cutoff"
            label="Auto-sell Cutoff Time (HH:MM or HH:MM:SS)"
            type="time"
            step="1" // for seconds
            value={settings.auto_sell_cutoff.substring(0, settings.auto_sell_cutoff.length > 5 ? 8: 5)} // Handle HH:MM and HH:MM:SS
            onChange={(e) => {
              let value = e.target.value;
              if(value.length === 5) value += ":00"; // append seconds if only HH:MM
              setSettings(prev => prev ? { ...prev, auto_sell_cutoff: value } : null)
            }}
            required
          />
          <div className="pt-2">
            <Button type="submit" variant="primary" isLoading={isLoading}>Save Settings</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};


// --- OrdersUploadPage ---
export const OrdersUploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      // FIX: Use ToastType enum member for type safety
      addToast('Please select an Excel file to upload.', ToastType.WARNING);
      return;
    }
    setIsLoading(true);
    setUploadResults([]);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const results = await apiFetch<OrderResponse[]>(API_ENDPOINTS.ORDERS_UPLOAD, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': undefined } as any, // Let browser set Content-Type for FormData
      });
      setUploadResults(results);
      // FIX: Use ToastType enum member for type safety
      addToast(`File uploaded successfully. ${results.length} orders processed.`, ToastType.SUCCESS);
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to upload orders: ${error.message}`, ToastType.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnDefinition<OrderResponse, keyof OrderResponse>[] = [
    { key: 'symbol', header: 'Symbol' },
    { key: 'qty', header: 'Qty' },
    { key: 'target_percent', header: 'Target %' },
    { key: 'ltp_at_upload', header: 'LTP at Upload' },
    { key: 'target_price', header: 'Target Price' },
    { key: 'stoploss_price', header: 'Stoploss Price' },
    { key: 'status', header: 'Status', render: (item) => <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
        item.status === 'executed' ? 'bg-green-100 text-green-800' :
        item.status === 'failed' ? 'bg-red-100 text-red-800' :
        'bg-gray-100 text-gray-800'}`}>{item.status}</span> },
    { key: 'reason', header: 'Reason' },
  ];
  
  return (
    <div>
      <PageTitle title="Upload Pending Orders"/>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FileInput
            id="ordersFile"
            label="Select Excel File (.xlsx, .xls)"
            onChange={handleFileChange}
            accept=".xlsx,.xls"
          />
          <Button type="submit" variant="primary" isLoading={isLoading} disabled={!file}>
            Upload Orders
          </Button>
        </form>
      </Card>

      {uploadResults.length > 0 && (
        <Card title="Upload Results" className="mt-6">
          <Table<OrderResponse>
            columns={columns}
            data={uploadResults}
            isLoading={false} // Data is already loaded
          />
        </Card>
      )}
    </div>
  );
};

// --- OrderMonitorPage ---
export const OrderMonitorPage: React.FC = () => {
  const [monitorStatus, setMonitorStatus] = useState<OrderMonitorStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();
  const { orderUpdateData } = useWebSocket(); // For real-time order updates

  const fetchMonitorStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // Assuming an endpoint exists for this. Replace if different.
      const data = await apiFetch<OrderMonitorStatus>(API_ENDPOINTS.ORDER_MONITOR_STATUS);
      setMonitorStatus(data);
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to fetch order monitor status: ${error.message}`, ToastType.ERROR);
      setMonitorStatus({status: 'error', message: 'Could not fetch status'});
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMonitorStatus();
    // Potentially refetch status periodically or rely on WebSocket for changes
    // const intervalId = setInterval(fetchMonitorStatus, 30000); // e.g., every 30 seconds
    // return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (orderUpdateData) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Order ${orderUpdateData.order_id} status updated to ${orderUpdateData.status}`, ToastType.INFO);
      // Potentially refresh a list of active orders or logs here if needed
    }
  }, [orderUpdateData, addToast]);

  const getStatusColor = (status: string | undefined) => {
    if (status === 'running') return 'text-green-500';
    if (status === 'stopped') return 'text-yellow-500';
    if (status === 'error') return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div>
      <PageTitle title="Order Monitor"/>
      <Card title="Monitor Status">
        {isLoading ? <LoadingSpinner /> : monitorStatus ? (
          <div className="space-y-2">
            <p>Status: <span className={`font-semibold ${getStatusColor(monitorStatus.status)}`}>{monitorStatus.status.toUpperCase()}</span></p>
            {monitorStatus.last_check_time && <p>Last Check Time: <span className="font-semibold">{new Date(monitorStatus.last_check_time).toLocaleString()}</span></p>}
            {monitorStatus.message && <p>Message: <span className="font-semibold">{monitorStatus.message}</span></p>}
          </div>
        ) : <p>Order monitor status is unavailable.</p>}
      </Card>
      <Card title="Real-time Order Updates" className="mt-6">
        {orderUpdateData ? (
          <p>Last order update: ID <span className="font-semibold">{orderUpdateData.order_id}</span>, Status <span className="font-semibold">{orderUpdateData.status}</span>
          {orderUpdateData.price && (<span>, Price <span className="font-semibold">{orderUpdateData.price}</span></span>)}
          </p>
        ) : (
          <p className="text-gray-500">Waiting for order updates via WebSocket...</p>
        )}
      </Card>
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Order Logs</h3>
        <p className="text-gray-600">Detailed order logs can be viewed in the <a href="#/cron-logs" className="text-sky-600 hover:underline">Cron Logs</a> section (filter by 'monitor:orders' job name).</p>
      </div>
    </div>
  );
};


// --- PositionsPage ---
export const PositionsPage: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();
  const { tickData } = useWebSocket();
  const [editingNotesFor, setEditingNotesFor] = useState<Position | null>(null);
  const [currentNotes, setCurrentNotes] = useState("");

  const fetchPositions = useCallback(async () => {
    setIsLoading(true);
    try {
      // Assuming a /positions endpoint exists that returns Position[]
      const data = await apiFetch<Position[]>(API_ENDPOINTS.POSITIONS);
      setPositions(data.map(p => ({
        ...p,
        invested: p.qty * p.avg_cost,
        current_value: p.qty * p.ltp,
        pnl: (p.qty * p.ltp) - (p.qty * p.avg_cost),
        net_change_percent: p.avg_cost !== 0 ? ((p.ltp - p.avg_cost) / p.avg_cost) * 100 : 0,
      })));
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to fetch positions: ${error.message}`, ToastType.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);
  
  useEffect(() => {
    if (tickData) {
      setPositions(prevPositions => 
        prevPositions.map(p => {
          // Assuming tickData.instrument_token matches p.instrument or some ID
          if (p.instrument === tickData.instrument_token) { 
            const newLtp = tickData.ltp;
            return {
              ...p,
              ltp: newLtp,
              current_value: p.qty * newLtp,
              pnl: (p.qty * newLtp) - (p.qty * p.avg_cost),
              net_change_percent: p.avg_cost !== 0 ? ((newLtp - p.avg_cost) / p.avg_cost) * 100 : 0,
              // Day change would also update if tickData provides it or a way to calculate it
            };
          }
          return p;
        })
      );
    }
  }, [tickData]);

  const handleEditNotes = (position: Position) => {
    setEditingNotesFor(position);
    setCurrentNotes(position.notes || "");
  };

  const handleSaveNotes = async () => {
    if (!editingNotesFor) return;
    // Assume an API endpoint to update notes for a position
    // e.g., PUT /positions/{position.id}/notes with body { notes: currentNotes }
    // For now, just update locally and show a toast
    try {
      // MOCK API CALL - replace with actual
      // await apiFetch_(`/positions/${editingNotesFor.instrument}/notes`, { method: 'PUT', body: JSON.stringify({ notes: currentNotes }) });
      setPositions(positions.map(p => p.instrument === editingNotesFor.instrument ? { ...p, notes: currentNotes } : p));
      // FIX: Use ToastType enum member for type safety
      addToast('Notes updated successfully (mocked).', ToastType.SUCCESS);
      setEditingNotesFor(null);
      setCurrentNotes("");
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to save notes: ${error.message}`, ToastType.ERROR);
    }
  };


  const getPnlColor = (value?: number) => {
    if (value === undefined) return 'text-gray-700';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const columns: ColumnDefinition<Position, keyof Position>[] = [
    { key: 'instrument', header: 'Instrument', sortable: true },
    { key: 'qty', header: 'Qty', sortable: true },
    { key: 'avg_cost', header: 'Avg. Cost', render: item => item.avg_cost?.toFixed(2), sortable: true },
    { key: 'ltp', header: 'LTP', render: item => <span className={getPnlColor(item.ltp - item.avg_cost)}>{item.ltp?.toFixed(2)}</span>, sortable: true },
    { key: 'invested', header: 'Invested', render: item => item.invested?.toFixed(2), sortable: true },
    { key: 'current_value', header: 'Current Value', render: item => item.current_value?.toFixed(2), sortable: true },
    { key: 'pnl', header: 'P&L', render: item => <span className={getPnlColor(item.pnl)}>{item.pnl?.toFixed(2)}</span>, sortable: true },
    { key: 'net_change_percent', header: 'Net Chg %', render: item => <span className={getPnlColor(item.net_change_percent)}>{item.net_change_percent?.toFixed(2)}%</span>, sortable: true },
    { key: 'day_change_percent', header: 'Day Chg %', render: item => <span className={getPnlColor(item.day_change_percent)}>{item.day_change_percent !== undefined ? `${item.day_change_percent.toFixed(2)}%` : '—'}</span>, sortable: true },
    { key: 'two_days_change', header: '2D Chg', render: item => item.two_days_change || '—' },
    { key: 'week_change', header: 'Wk Chg', render: item => item.week_change || '—' },
    { key: 'buy_date', header: 'Buy Date', render: item => item.buy_date ? new Date(item.buy_date).toLocaleDateString() : '—' },
    { key: 'stop_loss_target', header: 'SL/Target', render: item => item.stop_loss_target || '— (Fixed)' },
    { key: 'notes', header: 'Notes', render: (item) => (
        <div className="max-w-xs truncate" title={item.notes}>
            {item.notes || '—'} 
            <Button size="sm" variant="ghost" onClick={() => handleEditNotes(item)} className="ml-1 p-0 inline text-sky-500">Edit</Button>
        </div>
    )},
  ];

  return (
    <div>
      <PageTitle title="Positions"/>
      <Table<Position>
        columns={columns}
        data={positions}
        isLoading={isLoading}
        emptyMessage="No positions to display."
      />
      <Modal isOpen={!!editingNotesFor} onClose={() => setEditingNotesFor(null)} title={`Edit Notes for ${editingNotesFor?.instrument}`}>
        <Textarea 
            value={currentNotes} 
            onChange={(e) => setCurrentNotes(e.target.value)} 
            rows={4} 
            className="w-full"
            placeholder="Enter notes..."
        />
        <div className="mt-4 flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setEditingNotesFor(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveNotes}>Save Notes</Button>
        </div>
      </Modal>
    </div>
  );
};


// --- GTTOrdersPage ---
export const GTTOrdersPage: React.FC = () => {
  const [gttOrders, setGttOrders] = useState<GTTOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const fetchGTTOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<GTTOrder[]>(API_ENDPOINTS.GTT_ORDERS);
      setGttOrders(data);
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to fetch GTT orders: ${error.message}`, ToastType.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchGTTOrders();
  }, [fetchGTTOrders]);

  const columns: ColumnDefinition<GTTOrder, keyof GTTOrder>[] = [
    { key: 'tradingsymbol', header: 'Symbol' },
    { key: 'trigger_price', header: 'Trigger Price' },
    { key: 'last_price', header: 'Last Price' },
    { key: 'status', header: 'Status' },
    // Add more columns based on GTTOrder structure
  ];

  return (
    <div>
      <PageTitle title="GTT Orders (Read-Only)"/>
      <Table<GTTOrder>
        columns={columns}
        data={gttOrders}
        isLoading={isLoading}
        emptyMessage="No GTT orders found."
      />
    </div>
  );
};


// --- WatchlistPage ---
export const WatchlistPage: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const { addToast } = useToast();
  const { tickData } = useWebSocket();

  const fetchWatchlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<WatchlistItem[]>(API_ENDPOINTS.WATCHLIST);
      setWatchlist(data);
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to fetch watchlist: ${error.message}`, ToastType.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  useEffect(() => {
    if (tickData) {
      setWatchlist(prevWatchlist =>
        prevWatchlist.map(item =>
          item.tradingsymbol === tickData.instrument_token // Assuming instrument_token matches tradingsymbol
            ? { ...item, ltp: tickData.ltp }
            : item
        )
      );
    }
  }, [tickData]);

  const handleAddSymbol = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) {
      // FIX: Use ToastType enum member for type safety
      addToast('Please enter a symbol.', ToastType.WARNING);
      return;
    }
    setIsLoading(true);
    try {
      await apiFetch<WatchlistItem>(API_ENDPOINTS.WATCHLIST, {
        method: 'POST',
        body: JSON.stringify({ tradingsymbol: newSymbol.trim().toUpperCase() }),
      });
      // FIX: Use ToastType enum member for type safety
      addToast(`${newSymbol} added to watchlist!`, ToastType.SUCCESS);
      setNewSymbol('');
      fetchWatchlist(); // Refresh list
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to add symbol: ${error.message}`, ToastType.ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSymbol = async (item: WatchlistItem) => {
    if (window.confirm(`Remove ${item.tradingsymbol} from watchlist?`)) {
      setIsLoading(true);
      try {
        await apiFetch<void>(`${API_ENDPOINTS.WATCHLIST}/${item.id}`, { method: 'DELETE' }); // Assuming ID is used for delete
        // FIX: Use ToastType enum member for type safety
        addToast(`${item.tradingsymbol} removed from watchlist.`, ToastType.SUCCESS);
        fetchWatchlist(); // Refresh list
      } catch (error: any) {
        // FIX: Use ToastType enum member for type safety
        addToast(`Failed to remove symbol: ${error.message}`, ToastType.ERROR);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const columns: ColumnDefinition<WatchlistItem, keyof WatchlistItem>[] = [
    { key: 'tradingsymbol', header: 'Symbol' },
    { key: 'ltp', header: 'LTP', render: item => item.ltp?.toFixed(2) || 'N/A' },
  ];

  return (
    <div>
      <PageTitle title="Watchlist"/>
      <Card className="mb-6">
        <form onSubmit={handleAddSymbol} className="flex items-end space-x-2">
          <Input
            containerClassName="flex-grow mb-0"
            id="newSymbol"
            label="Add Symbol"
            value={newSymbol}
            onChange={(e) => setNewSymbol(e.target.value)}
            placeholder="E.g., INFY"
          />
          <Button type="submit" variant="primary" isLoading={isLoading}>Add</Button>
        </form>
      </Card>
      <Table<WatchlistItem>
        columns={columns}
        data={watchlist}
        isLoading={isLoading}
        onDelete={handleDeleteSymbol}
        emptyMessage="Your watchlist is empty."
      />
    </div>
  );
};


// --- CronLogsPage ---
export const CronLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<{ job_name?: string; status?: string; limit: number; offset: number }>({ limit: 25, offset: 0 });
  const { addToast } = useToast();
  const [totalLogs, setTotalLogs] = useState(0); // Assume API might return total for pagination

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    let queryString = `?limit=${filters.limit}&offset=${filters.offset}`;
    if (filters.job_name) queryString += `&job_name=${filters.job_name}`;
    if (filters.status) queryString += `&status=${filters.status}`;

    try {
      // API might return total in headers or a wrapper object. Adapt as needed.
      // For now, assuming the response is just CronLog[]
      const data = await apiFetch<CronLog[]>(`${API_ENDPOINTS.CRON_LOGS}${queryString}`);
      setLogs(data);
      // Mock total logs for pagination example
      // if (data.length > 0 && filters.offset === 0) setTotalLogs(data.length + filters.limit * 2); // Mock
    } catch (error: any) {
      // FIX: Use ToastType enum member for type safety
      addToast(`Failed to fetch cron logs: ${error.message}`, ToastType.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [addToast, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, offset: 0 }));
  };

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };


  const columns: ColumnDefinition<CronLog, keyof CronLog>[] = [
    { key: 'timestamp', header: 'Timestamp', render: item => new Date(item.timestamp).toLocaleString() },
    { key: 'job_name', header: 'Job Name' },
    { key: 'status', header: 'Status', render: (item) => <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.status}</span> },
    { key: 'message', header: 'Message', render: item => <span className="truncate block max-w-md" title={item.message}>{item.message || 'N/A'}</span> },
  ];

  return (
    <div>
      <PageTitle title="Cron Job Logs"/>
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select name="job_name" label="Filter by Job Name" value={filters.job_name || ''} onChange={handleFilterChange} options={[{value: '', label: 'All Jobs'}, ...CRON_LOG_JOB_NAME_OPTIONS.map(j => ({value: j, label: j}))]} placeholder="All Jobs"/>
          <Select name="status" label="Filter by Status" value={filters.status || ''} onChange={handleFilterChange} options={[{value: '', label: 'All Statuses'}, ...CRON_LOG_STATUS_OPTIONS.map(s => ({value: s, label: s.charAt(0).toUpperCase() + s.slice(1)}))]} placeholder="All Statuses"/>
        </div>
      </Card>
      <Table<CronLog>
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage="No logs found."
      />
      {/* Basic Pagination Example - replace with more robust component if needed */}
      <div className="mt-4 flex justify-between items-center">
        <Button 
            onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))} 
            disabled={filters.offset === 0 || isLoading}
        >
            Previous
        </Button>
        <span>Page {Math.floor(filters.offset / filters.limit) + 1}</span>
        <Button 
            onClick={() => handlePageChange(filters.offset + filters.limit)}
            // Disable if on last page - requires knowing total logs
            disabled={logs.length < filters.limit || isLoading} 
        >
            Next
        </Button>
      </div>
    </div>
  );
};
