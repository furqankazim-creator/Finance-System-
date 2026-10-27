export const mockDemoUser = {
  id: '6ad9ebf3ffbde65cb435eb6a',
  fullName: 'Demo Executive',
  email: 'demo@gmail.com',
  role: 'admin' as const,
};

export const mockOrg = {
  _id: 'org_demo_101',
  name: 'Acme Enterprise Global Ltd',
  currency: 'PKR',
  fiscalYearStart: 1,
  taxId: 'PK-NTN-9842104-7',
  email: 'finance@acme.com',
  phone: '+92 300 1234567',
  address: 'Level 14, Executive Financial Tower, Clifton',
  city: 'Karachi',
  country: 'Pakistan',
  invoicePrefix: 'INV-',
  paymentTermsDays: 30,
  partnerEmails: ['boss@acme.com', 'partner@acme.com', 'investors@acme.com'],
  weeklyDigestEnabled: true,
  monthlyDigestEnabled: true,
  notes: 'Bank: Standard Chartered Bank / HBL\nAccount: 01-2345678-01\nIBAN: PK36SCBL0000001123456701',
};

export const mockDashboardStats = {
  currentMonth: {
    revenueCents: 485000000,
    expensesCents: 242000000,
    netProfitCents: 243000000,
  },
  previousMonth: {
    revenueCents: 410000000,
    expensesCents: 230000000,
    netProfitCents: 180000000,
  },
  outstandingInvoices: [
    { _id: 'inv_1', invoiceNumber: 'INV-2024-001', amountCents: 75000000, status: 'sent', dueDate: '2026-11-15' },
    { _id: 'inv_2', invoiceNumber: 'INV-2024-002', amountCents: 42000000, status: 'overdue', dueDate: '2026-10-20' },
  ],
};

export const mockBreakdown = {
  topIncome: [
    { name: 'Enterprise SaaS Retainer', totalCents: 250000000 },
    { name: 'Custom Cloud Architecture', totalCents: 150000000 },
    { name: 'Support & Security Audits', totalCents: 85000000 },
  ],
  topExpense: [
    { name: 'Payroll & Compensation', totalCents: 120000000 },
    { name: 'Cloud & Infrastructure (AWS)', totalCents: 45000000 },
    { name: 'Office Operations & Lease', totalCents: 42000000 },
    { name: 'Legal & Accounting Software', totalCents: 35000000 },
  ],
  monthlyTrend: [
    { month: 'Jun', revenueCents: 340000000, expenseCents: 210000000 },
    { month: 'Jul', revenueCents: 380000000, expenseCents: 220000000 },
    { month: 'Aug', revenueCents: 410000000, expenseCents: 230000000 },
    { month: 'Sep', revenueCents: 450000000, expenseCents: 235000000 },
    { month: 'Oct', revenueCents: 485000000, expenseCents: 242000000 },
  ],
};

export const mockClients = [
  { _id: 'c_1', name: 'Al-Baraka Financial Group', email: 'billing@albaraka.com', phone: '+92 21 34567890', company: 'Al-Baraka', isActive: true },
  { _id: 'c_2', name: 'Nexus Telecom Corp', email: 'accounts@nexustelecom.pk', phone: '+92 51 8899000', company: 'Nexus Telecom', isActive: true },
  { _id: 'c_3', name: 'Indus Logistics Worldwide', email: 'ap@induslogistics.com', phone: '+92 42 11122334', company: 'Indus Logistics', isActive: true },
  { _id: 'c_4', name: 'Crescent Retail Chains', email: 'finance@crescent.pk', phone: '+92 21 99887766', company: 'Crescent Retail', isActive: true },
];

export const mockProjects = [
  { _id: 'p_1', clientId: 'c_1', name: 'Core Banking Modernization', budgetCents: 350000000, status: 'active', startDate: '2026-01-10' },
  { _id: 'p_2', clientId: 'c_2', name: '5G Infrastructure Rollout', budgetCents: 500000000, status: 'active', startDate: '2026-03-01' },
  { _id: 'p_3', clientId: 'c_3', name: 'Fleet Management Telematics', budgetCents: 200000000, status: 'active', startDate: '2026-05-15' },
];

export const mockCategories = [
  { _id: 'cat_1', name: 'Engineering & Development', type: 'cogs', color: '#0d6847' },
  { _id: 'cat_2', name: 'Cloud Infrastructure & Servers', type: 'opex', color: '#1f352c' },
  { _id: 'cat_3', name: 'Office Rent & Facilities', type: 'opex', color: '#2a4436' },
  { _id: 'cat_4', name: 'Executive & Staff Salaries', type: 'cogs', color: '#0d6847' },
  { _id: 'cat_5', name: 'Legal, Audit & Compliance', type: 'opex', color: '#556b2f' },
];

export const mockInvoices = [
  {
    _id: 'inv_101',
    invoiceNumber: 'INV-2026-0089',
    clientId: mockClients[0],
    projectId: mockProjects[0],
    amountCents: 145000000,
    status: 'paid',
    issueDate: '2026-10-01',
    dueDate: '2026-10-31',
    description: 'Q3 Enterprise Core Banking Modernization Retainer',
    items: [{ description: 'Architecture & Engine Milestone', quantity: 1, unitPriceCents: 145000000, totalCents: 145000000 }],
  },
  {
    _id: 'inv_102',
    invoiceNumber: 'INV-2026-0090',
    clientId: mockClients[1],
    projectId: mockProjects[1],
    amountCents: 180000000,
    status: 'sent',
    issueDate: '2026-10-15',
    dueDate: '2026-11-15',
    description: '5G Infrastructure Software Licensing & Integration',
    items: [{ description: 'Platform Deployment & Security Tests', quantity: 1, unitPriceCents: 180000000, totalCents: 180000000 }],
  },
  {
    _id: 'inv_103',
    invoiceNumber: 'INV-2026-0091',
    clientId: mockClients[2],
    projectId: mockProjects[2],
    amountCents: 95000000,
    status: 'overdue',
    issueDate: '2026-09-10',
    dueDate: '2026-10-10',
    description: 'Fleet Telematics Real-Time Tracking SDK Phase 1',
    items: [{ description: 'Phase 1 Deliverables', quantity: 1, unitPriceCents: 95000000, totalCents: 95000000 }],
  },
  {
    _id: 'inv_104',
    invoiceNumber: 'INV-2026-0092',
    clientId: mockClients[3],
    amountCents: 65000000,
    status: 'draft',
    issueDate: '2026-10-25',
    dueDate: '2026-11-25',
    description: 'Omnichannel POS Payment Integration Maintenance',
    items: [{ description: 'Maintenance Services', quantity: 1, unitPriceCents: 65000000, totalCents: 65000000 }],
  },
];

export const mockExpenses = [
  { _id: 'exp_1', date: '2026-10-22', vendor: 'Amazon Web Services (AWS)', categoryId: 'cat_2', amountCents: 38500000, status: 'approved' },
  { _id: 'exp_2', date: '2026-10-18', vendor: 'Habib Bank Tower Leasing', categoryId: 'cat_3', amountCents: 42000000, status: 'paid' },
  { _id: 'exp_3', date: '2026-10-15', vendor: 'KPMG Tax Advisory', categoryId: 'cat_5', amountCents: 25000000, status: 'approved' },
  { _id: 'exp_4', date: '2026-10-10', vendor: 'GitHub Enterprise & Tooling', categoryId: 'cat_1', amountCents: 12000000, status: 'paid' },
  { _id: 'exp_5', date: '2026-10-05', vendor: 'Fiber Optic High-Speed ISP', categoryId: 'cat_3', amountCents: 6500000, status: 'paid' },
];

export const mockBankAccounts = [
  {
    _id: 'ba_1',
    bankName: 'Standard Chartered Bank',
    accountNumberMasked: '•••• 6701',
    accountType: 'Current / Checking',
    balanceCents: 382450000,
    currency: 'PKR',
    transactionCount: 42,
  },
  {
    _id: 'ba_2',
    bankName: 'Habib Bank Limited (HBL Corporate)',
    accountNumberMasked: '•••• 9122',
    accountType: 'Savings & Treasury',
    balanceCents: 520000000,
    currency: 'PKR',
    transactionCount: 28,
  },
];

export const mockBankTransactions = [
  { _id: 'tx_1', date: '2026-10-24', description: 'Wire Transfer IN: Al-Baraka Milestone', amountCents: 145000000, direction: 'inflow', status: 'matched' },
  { _id: 'tx_2', date: '2026-10-22', description: 'AWS Cloud Services Debit', amountCents: 38500000, direction: 'outflow', status: 'matched' },
  { _id: 'tx_3', date: '2026-10-19', description: 'Client Retainer: Nexus Telecom', amountCents: 80000000, direction: 'inflow', status: 'matched' },
  { _id: 'tx_4', date: '2026-10-18', description: 'Office Lease Direct Debit', amountCents: 42000000, direction: 'outflow', status: 'matched' },
  { _id: 'tx_5', date: '2026-10-16', description: 'Vendor Payment: Software Licenses', amountCents: 12000000, direction: 'outflow', status: 'unmatched' },
];

export const mockTeamMembers = [
  { _id: 'tm_1', fullName: 'Demo Executive', email: 'demo@gmail.com', role: 'admin' as const, createdAt: '2026-01-01' },
  { _id: 'tm_2', fullName: 'Furqan Kazim', email: 'furqanworking@gmail.com', role: 'admin' as const, createdAt: '2026-01-15' },
  { _id: 'tm_3', fullName: 'Tariq Mehmood', email: 'tariq@acme.com', role: 'accountant' as const, createdAt: '2026-03-10' },
  { _id: 'tm_4', fullName: 'Sarah Jenkins', email: 'sarah.audit@acme.com', role: 'auditor' as const, createdAt: '2026-05-20' },
];
