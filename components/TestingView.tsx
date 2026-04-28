'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SendIcon from '@mui/icons-material/Send';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

// ── Static test-step data ─────────────────────────────────────────────────────

type Step = {
  id: string;
  module: string;
  scenario: string;
  type: 'Automated' | 'Manual';
  roles: string;
  validates: string;
  isCustom?: boolean;
};

const STEPS: Step[] = [
  { id:'1',  module:'Authentication', scenario:'Login with valid credentials', type:'Automated', roles:'superAdmin, admin, partnerAdmin, partnerUser', validates:'HTTP 200; response contains token + refreshToken + permissions + userProfile' },
  { id:'2',  module:'Authentication', scenario:'Reject login with invalid credentials', type:'Automated', roles:'Public (no auth)', validates:'HTTP 400/401/422 on wrong email or password' },
  { id:'3',  module:'Authentication', scenario:'Get own user profile (/users/me)', type:'Automated', roles:'superAdmin, admin, partnerAdmin, partnerUser', validates:'HTTP 200; id and email match logged-in session' },
  { id:'4',  module:'Authentication', scenario:'Get own permission list (/permissions/me)', type:'Automated', roles:'superAdmin, admin, partnerAdmin, partnerUser', validates:'HTTP 200; returned permission array matches session role' },
  { id:'5',  module:'Authentication', scenario:'Refresh access token', type:'Automated', roles:'superAdmin, admin, partnerAdmin, partnerUser', validates:'HTTP 200; new token and new refreshToken returned' },
  { id:'6',  module:'Authentication', scenario:'Logout (single session)', type:'Automated', roles:'superAdmin, admin, partnerAdmin, partnerUser', validates:'HTTP 200; {success:true}; token invalidated' },
  { id:'7',  module:'Authentication', scenario:'Refresh token reuse detection (security alert)', type:'Manual', roles:'Any role', validates:'Reusing a revoked refresh token triggers full session revoke + security alert email' },
  { id:'8',  module:'Authentication', scenario:'Logout all devices', type:'Manual', roles:'Any role', validates:'All active sessions invalidated after LogoutAll call' },
  { id:'9',  module:'Authentication', scenario:'Password reset flow', type:'Manual', roles:'Public', validates:'Reset email received; link valid; new password accepted' },
  { id:'10', module:'RBAC — Roles & Permissions', scenario:'Role permissions enforced on API endpoints', type:'Automated', roles:'All 4 roles', validates:'Role without permission gets HTTP 403; role with permission gets HTTP 200' },
  { id:'11', module:'RBAC — Roles & Permissions', scenario:'Menu visibility matches role permissions', type:'Manual', roles:'All 4 roles', validates:'Only permitted sections visible in sidebar; no orphaned menu items' },
  { id:'12', module:'RBAC — Roles & Permissions', scenario:'Route guard blocks direct URL access', type:'Manual', roles:'All 4 roles', validates:'Navigating to unauthorized URL redirects or shows access denied' },
  { id:'13', module:'RBAC — Roles & Permissions', scenario:'Action buttons hidden for unpermissioned users', type:'Manual', roles:'All 4 roles', validates:'Create/Edit/Delete buttons absent when user lacks write permission' },
  { id:'14', module:'RBAC — Roles & Permissions', scenario:'List roles (permission-gated)', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with role list; HTTP 403 for unpermissioned roles' },
  { id:'15', module:'RBAC — Roles & Permissions', scenario:'List available permissions', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with permission catalog' },
  { id:'16', module:'RBAC — Roles & Permissions', scenario:'Get role by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching id and name; HTTP 403 if no roles.view' },
  { id:'17', module:'RBAC — Roles & Permissions', scenario:'Create custom role (manual)', type:'Manual', roles:'superAdmin', validates:'Role created; permissions assigned; user with that role has correct access' },
  { id:'18', module:'Partner Management', scenario:'List partners (permission-gated)', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with pagination meta; HTTP 403 if no partners.view' },
  { id:'19', module:'Partner Management', scenario:'Get partner by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching id and name; HTTP 403 if no partners.view' },
  { id:'20', module:'Partner Management', scenario:'Get own partner (/partners/me)', type:'Automated', roles:'partnerAdmin, partnerUser', validates:'HTTP 200 with partner id and name (or 404 if not assigned)' },
  { id:'21', module:'Partner Management', scenario:'Create Reseller partner', type:'Manual', roles:'superAdmin', validates:'Partner created with level=1; displayed as Reseller in list and details' },
  { id:'22', module:'Partner Management', scenario:'Create Sub-Reseller under Reseller', type:'Manual', roles:'superAdmin, admin, partnerAdmin (Reseller)', validates:'Partner created with level=2; displayed as Sub-Reseller; parent hierarchy correct' },
  { id:'23', module:'Partner Management', scenario:'Create Retailer under Sub-Reseller', type:'Manual', roles:'superAdmin, admin, partnerAdmin (Sub-Reseller)', validates:'Partner created with level=3; displayed as Retailer; subtree visible to parents only' },
  { id:'24', module:'Partner Management', scenario:'Block creation of partner at wrong level', type:'Manual', roles:'Any', validates:'Cannot create Sub-Reseller directly under Platform or Retailer under Reseller' },
  { id:'25', module:'Partner Management', scenario:'Edit partner details', type:'Manual', roles:'superAdmin, admin', validates:'Name / email / phone / balance type saved correctly; quota fields pre-filled' },
  { id:'26', module:'Partner Management', scenario:'Quota enforcement — exceed parent limit', type:'Manual', roles:'superAdmin, admin', validates:'Creating child beyond quota limit returns validation error' },
  { id:'27', module:'Partner Management', scenario:'Quota display on partner details', type:'Manual', roles:'superAdmin, admin', validates:'Shows correct used/limit values per type (sub-resellers / retailers / users)' },
  { id:'28', module:'Partner Management', scenario:'Partner subtree visibility', type:'Manual', roles:'partnerAdmin', validates:'Partner sees only its own children; cannot access sibling or parent subtrees' },
  { id:'29', module:'Partner Management', scenario:'Balance type selection', type:'Manual', roles:'superAdmin, admin', validates:'Dropdown shows placeholder first; both Prepaid and Postpaid selectable; saves correctly' },
  { id:'30', module:'Users Management', scenario:'List users (permission-gated)', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with user list; HTTP 403 if no users.view' },
  { id:'31', module:'Users Management', scenario:'Get user by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching id and email; HTTP 403 if no users.view' },
  { id:'32', module:'Users Management', scenario:'Create user and assign to partner', type:'Manual', roles:'superAdmin, admin', validates:'User created; role assigned; login works with correct permissions' },
  { id:'33', module:'Users Management', scenario:'Edit user details', type:'Manual', roles:'superAdmin, admin', validates:'Changes saved; role update reflected immediately on next login' },
  { id:'34', module:'Users Management', scenario:'Search users by name/email', type:'Manual', roles:'superAdmin, admin', validates:'Search returns relevant results only' },
  { id:'35', module:'Users Management', scenario:'Filter users by partner', type:'Manual', roles:'superAdmin, admin', validates:'Only users belonging to selected partner shown' },
  { id:'36', module:'Users Management', scenario:'Filter users by role', type:'Manual', roles:'superAdmin, admin', validates:'Only users with selected role shown' },
  { id:'37', module:'API Keys', scenario:'List API keys (permission-gated)', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with id and isActive per key; HTTP 403 if no api_keys.view' },
  { id:'38', module:'Quotas', scenario:'Get default quota settings', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with subResellerQuotaDefault + retailerQuotaDefault + userQuotaDefault' },
  { id:'39', module:'Quotas', scenario:'Get quotas for specific partner', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with subResellerQuota + retailerQuota + userQuota; HTTP 403 if no quotas.view' },
  { id:'40', module:'ICCID Management', scenario:'List ICCIDs (permission-gated)', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with pagination meta; HTTP 403 if no iccids.view' },
  { id:'41', module:'ICCID Management', scenario:'Get ICCID status history', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with history array (id + newStatus + occurredAt); HTTP 403 if no iccids.view' },
  { id:'42', module:'ICCID Management', scenario:'View all / available / assigned ICCID tabs', type:'Manual', roles:'superAdmin, admin', validates:'Correct ICCIDs shown in each view; counts match' },
  { id:'43', module:'ICCID Management', scenario:'Assign ICCID to partner', type:'Manual', roles:'superAdmin, admin', validates:'ICCID moves to Assigned view; partner name shown; assigned date recorded' },
  { id:'44', module:'ICCID Management', scenario:'Reclaim ICCID from partner', type:'Manual', roles:'superAdmin, admin', validates:'ICCID returns to Available; partner assignment cleared' },
  { id:'45', module:'ICCID Management', scenario:'Transfer ICCID down hierarchy', type:'Manual', roles:'superAdmin, admin', validates:'ICCID assigned to child partner within hierarchy; blocked for out-of-hierarchy target' },
  { id:'46', module:'ICCID Management', scenario:'ICCID details — QR code and data usage', type:'Manual', roles:'superAdmin, admin, partnerAdmin', validates:'QR code visible; data usage and network events displayed' },
  { id:'47', module:'Providers', scenario:'List providers (permission-gated)', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with id + providerKey + name; HTTP 403 if no providers.view' },
  { id:'48', module:'Providers', scenario:'Get provider by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching id; HTTP 403 if no providers.view' },
  { id:'49', module:'Providers', scenario:'List ICCIDs for provider', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with items array and totalCount; HTTP 403 if no providers.view' },
  { id:'50', module:'Sponsors', scenario:'List sponsors by provider', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with sponsor list matching providerId; HTTP 403 if no sponsors.view' },
  { id:'51', module:'Sponsors', scenario:'Get sponsor by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching id + name + providerId; HTTP 403 if no sponsors.view' },
  { id:'52', module:'Countries & Networks', scenario:'List countries', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with id + name + isoAlpha2; HTTP 403 if no countries.view' },
  { id:'53', module:'Countries & Networks', scenario:'Get country by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching id and isoAlpha2; HTTP 403 if no countries.view' },
  { id:'54', module:'Countries & Networks', scenario:'List country networks (MCC/MNC)', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with networks list (id + mcc + mnc + countryId); HTTP 403 if no countries.view' },
  { id:'55', module:'Location Zones', scenario:'List location zones', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with id + name + networkCount; HTTP 403 if no location_zones.view' },
  { id:'56', module:'Location Zones', scenario:'Get location zone by ID (with networks)', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching id + name + networks array; HTTP 403 if no location_zones.view' },
  { id:'57', module:'Location Zones', scenario:'View and manage location zones in UI', type:'Manual', roles:'superAdmin, admin', validates:'Location zones listed; filter by sponsor works' },
  { id:'58', module:'2SkyMobile Sync', scenario:'ICCID sync from 2SkyMobile (verify populated data)', type:'Manual', roles:'superAdmin', validates:'ICCIDs imported from 2Sky visible in ICCID list with correct status and activation data' },
  { id:'59', module:'2SkyMobile Sync', scenario:'Location zone sync from 2SkyMobile', type:'Manual', roles:'superAdmin', validates:'Location zones from 2Sky visible with correct MCC/MNC networks' },
  { id:'60', module:'Billing — Exchange Rates', scenario:'List exchange rates', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with currency + rate; HTTP 403 if no exchange_rates.view' },
  { id:'61', module:'Billing — Exchange Rates', scenario:'Get exchange rate by currency', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with rate envelope and matching currency; HTTP 403 if no permission' },
  { id:'62', module:'Billing — Exchange Rates', scenario:'Get exchange rate history', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with history list (id + effectiveFrom) + pagination; HTTP 403 if no permission' },
  { id:'63', module:'Billing — Exchange Rates', scenario:'Set new exchange rate', type:'Manual', roles:'superAdmin', validates:'New rate recorded; history entry created; previous rate superseded' },
  { id:'64', module:'Billing — Invoices', scenario:'List invoices', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with pagination meta; HTTP 403 if no invoices.view' },
  { id:'65', module:'Billing — Invoices', scenario:'Get invoice by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching invoice id; HTTP 403 if no permission' },
  { id:'66', module:'Billing — Invoices', scenario:'Get invoice PDF URL', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with invoiceId + url + expiresAt; or 404 if PDF not yet generated' },
  { id:'67', module:'Billing — Invoices', scenario:'List invoice payments', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with payments list (id + invoiceId) + pagination; HTTP 403 if no permission' },
  { id:'68', module:'Billing — Invoices', scenario:'Full invoice lifecycle: Draft → Review → Unpaid → Paid', type:'Manual', roles:'superAdmin, admin', validates:'Each status transition correct; balance topped up on payment confirmation' },
  { id:'69', module:'Billing — Invoices', scenario:'Invoice — partial payment', type:'Manual', roles:'superAdmin, admin', validates:'Invoice moves to PartiallyPaid; remaining balance tracked' },
  { id:'70', module:'Billing — Invoices', scenario:'Invoice — payment rejection', type:'Manual', roles:'superAdmin, admin', validates:'Payment rejected; invoice status recalculated correctly' },
  { id:'71', module:'Billing — Invoices', scenario:'Invoice — refund', type:'Manual', roles:'superAdmin, admin', validates:'Refund recorded; invoice status recalculated (Voided / PartiallyPaid)' },
  { id:'72', module:'Billing — Invoices', scenario:'Invoice — rollback / chargeback', type:'Manual', roles:'superAdmin, admin', validates:'All pending payments rejected; invoice voided' },
  { id:'73', module:'Billing — Invoices', scenario:'Invoice visibility by role', type:'Manual', roles:'superAdmin, admin, partnerAdmin', validates:'Draft visible to author only; Review to issuer; Unpaid+ to payer and issuer' },
  { id:'74', module:'Billing — Templates', scenario:'List invoice templates', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with id + name + isActive; HTTP 403 if no invoice_templates.view' },
  { id:'75', module:'Billing — Templates', scenario:'Get invoice template by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching template id; HTTP 403 if no permission' },
  { id:'76', module:'Billing — Templates', scenario:'Create invoice template', type:'Manual', roles:'superAdmin, admin', validates:'Template created; activate/deactivate transitions work' },
  { id:'77', module:'Billing — Balances', scenario:'Get own balance (/balances/me)', type:'Automated', roles:'partnerAdmin, partnerUser', validates:'HTTP 200 with balance object; non-partner roles get 403 PARTNER_CONTEXT_REQUIRED' },
  { id:'78', module:'Billing — Balances', scenario:'Get balance by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching balance id; HTTP 403 if no permission' },
  { id:'79', module:'Billing — Balances', scenario:'List balance transactions', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with transactions (id + createdAt) + pagination; HTTP 403 if no permission' },
  { id:'80', module:'Billing — Balances', scenario:'Balance updated after payment approval', type:'Manual', roles:'superAdmin, admin', validates:'Balance increases by payment amount when invoice confirmed' },
  { id:'81', module:'Billing — Payments', scenario:'Get payment by ID', type:'Automated', roles:'superAdmin, admin', validates:'HTTP 200 with matching payment id; HTTP 403 if no permission' },
  { id:'82', module:'Health', scenario:'Service availability', type:'Automated', roles:'Public', validates:'HTTP 200 or 503 — service responds' },
];

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: '#9e9e9e' },
  pass:     { label: 'Pass',     color: '#388e3c' },
  fail:     { label: 'Fail',     color: '#c62828' },
  blocked:  { label: 'Blocked',  color: '#f57c00' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Result = { step_id: string; status: string; notes: string | null; updated_by: string | null; updated_at: string };
type Comment = { id: string; step_id: string | null; author_email: string; message: string; attachment_url: string | null; created_at: string };
type CustomStep = { id: string; module: string; scenario: string; type: 'Automated' | 'Manual'; validates: string; created_at: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
}

// ── Add Scenario Dialog ───────────────────────────────────────────────────────

const STATIC_MODULES = Array.from(new Set(STEPS.map((s) => s.module)));

function AddScenarioDialog({
  open,
  folderId,
  existingModules,
  onClose,
  onCreated,
}: {
  open: boolean;
  folderId: string;
  existingModules: string[];
  onClose: () => void;
  onCreated: (step: CustomStep) => void;
}) {
  const allModules = Array.from(new Set([...STATIC_MODULES, ...existingModules]));
  const [moduleVal, setModuleVal] = useState('');
  const [customModule, setCustomModule] = useState('');
  const [scenario, setScenario] = useState('');
  const [type, setType] = useState<'Automated' | 'Manual'>('Manual');
  const [validates, setValidates] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function reset() {
    setModuleVal(''); setCustomModule(''); setScenario('');
    setType('Manual'); setValidates(''); setErr('');
  }

  // Reset form each time dialog opens
  useEffect(() => { if (open) reset(); }, [open]); // reset is stable (only uses setters)

  async function handleSubmit() {
    const mod = moduleVal === '__custom__' ? customModule.trim() : moduleVal.trim();
    if (!mod || !scenario.trim()) { setErr('Module and Scenario are required'); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch('/api/testing/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, module: mod, scenario: scenario.trim(), type, validates: validates.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'Error'); return; }
      const data: CustomStep = await res.json();
      onCreated(data);
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add Scenario</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {err && <Typography color="error" variant="caption">{err}</Typography>}

          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Module *</Typography>
            <Select
              value={moduleVal}
              onChange={(e) => setModuleVal(e.target.value)}
              displayEmpty
              size="small"
              fullWidth
            >
              <MenuItem value="" disabled><em>Select module…</em></MenuItem>
              {allModules.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              <MenuItem value="__custom__">+ New module…</MenuItem>
            </Select>
            {moduleVal === '__custom__' && (
              <TextField
                size="small" fullWidth sx={{ mt: 1 }}
                placeholder="Module name"
                value={customModule}
                onChange={(e) => setCustomModule(e.target.value)}
              />
            )}
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Scenario *</Typography>
            <TextField size="small" fullWidth multiline minRows={2} placeholder="Describe the test scenario"
              value={scenario} onChange={(e) => setScenario(e.target.value)} />
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Type</Typography>
            <Select value={type} onChange={(e) => setType(e.target.value as 'Automated' | 'Manual')} size="small" fullWidth>
              <MenuItem value="Manual">Manual</MenuItem>
              <MenuItem value="Automated">Automated</MenuItem>
            </Select>
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Validates (acceptance criteria)</Typography>
            <TextField size="small" fullWidth multiline minRows={2} placeholder="What this test validates…"
              value={validates} onChange={(e) => setValidates(e.target.value)} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={16} color="inherit" /> : 'Add Scenario'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Edit Scenario Dialog ──────────────────────────────────────────────────────

function EditScenarioDialog({
  step,
  existingModules,
  onClose,
  onSaved,
}: {
  step: CustomStep | null;
  existingModules: string[];
  onClose: () => void;
  onSaved: (step: CustomStep) => void;
}) {
  const allModules = Array.from(new Set([...STATIC_MODULES, ...existingModules]));
  const [moduleVal, setModuleVal] = useState('');
  const [scenario, setScenario] = useState('');
  const [type, setType] = useState<'Automated' | 'Manual'>('Manual');
  const [validates, setValidates] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (step) {
      setModuleVal(step.module);
      setScenario(step.scenario);
      setType(step.type);
      setValidates(step.validates);
      setErr('');
    }
  }, [step]);

  async function handleSubmit() {
    if (!moduleVal.trim() || !scenario.trim()) { setErr('Module and Scenario are required'); return; }
    setSaving(true);
    setErr('');
    try {
      const res = await fetch('/api/testing/steps', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: step!.id, module: moduleVal.trim(), scenario: scenario.trim(), type, validates: validates.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? 'Error'); return; }
      const data: CustomStep = await res.json();
      onSaved(data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(step)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Scenario</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {err && <Typography color="error" variant="caption">{err}</Typography>}

          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Module *</Typography>
            <Select value={moduleVal} onChange={(e) => setModuleVal(e.target.value)} size="small" fullWidth>
              {allModules.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Scenario *</Typography>
            <TextField size="small" fullWidth multiline minRows={2} value={scenario} onChange={(e) => setScenario(e.target.value)} />
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Type</Typography>
            <Select value={type} onChange={(e) => setType(e.target.value as 'Automated' | 'Manual')} size="small" fullWidth>
              <MenuItem value="Manual">Manual</MenuItem>
              <MenuItem value="Automated">Automated</MenuItem>
            </Select>
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Validates (acceptance criteria)</Typography>
            <TextField size="small" fullWidth multiline minRows={2} value={validates} onChange={(e) => setValidates(e.target.value)} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={16} color="inherit" /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Step Drawer ───────────────────────────────────────────────────────────────

function StepDrawer({
  step,
  folderId,
  result,
  comments,
  pendingNotes,
  savingNotes,
  updatingStatus,
  currentUser,
  isAdmin,
  isCustom,
  onClose,
  onStatusChange,
  onNotesChange,
  onSaveNotes,
  onCommentSent,
  onDeleteStep,
}: {
  step: Step;
  folderId: string;
  result: Result | undefined;
  comments: Comment[];
  pendingNotes: string | undefined;
  savingNotes: boolean;
  updatingStatus: boolean;
  currentUser: { email: string };
  isAdmin: boolean;
  isCustom: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onNotesChange: (val: string) => void;
  onSaveNotes: () => void;
  onCommentSent: (comment: Comment) => void;
  onDeleteStep: () => void;
}) {
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const stepComments = comments.filter((c) => c.step_id === step.id);
  const sm = STATUS_META[result?.status ?? 'pending'];
  const notesVal = pendingNotes !== undefined ? pendingNotes : (result?.notes ?? '');
  const notesDirty = pendingNotes !== undefined && pendingNotes !== (result?.notes ?? '');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stepComments.length]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const res = await fetch('/api/testing/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      if (!res.ok) { setUploadError('Failed to get upload URL'); return; }
      const { signedUrl, publicUrl } = await res.json();
      const upload = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (upload.ok) {
        setPendingAttachment({ url: publicUrl, name: file.name });
      } else {
        setUploadError('Upload failed. Try again.');
      }
    } catch {
      setUploadError('Network error during upload.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSend() {
    if (!draft.trim() && !pendingAttachment) return;
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/testing/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          stepId: step.id,
          message: draft.trim(),
          attachmentUrl: pendingAttachment?.url ?? null,
        }),
      });
      if (res.ok) {
        const data: Comment = await res.json();
        onCommentSent(data);
        setDraft('');
        setPendingAttachment(null);
      } else {
        setSendError('Failed to send. Try again.');
      }
    } catch {
      setSendError('Network error. Try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Box sx={{ width: 420, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <Box flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Chip
                label={step.type}
                size="small"
                sx={{
                  fontSize: 10, fontWeight: 700, height: 20, borderRadius: '999px',
                  bgcolor: step.type === 'Automated' ? '#1976d211' : '#f57c0011',
                  color: step.type === 'Automated' ? '#1976d2' : '#f57c00',
                }}
              />
              {isCustom && (
                <Chip label="custom" size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#7b1fa211', color: '#7b1fa2' }} />
              )}
            </Stack>
            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.4, mb: 0.5 }}>
              {step.scenario}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {step.module}
            </Typography>
            {/* Status inline */}
            <Select
              value={result?.status ?? 'pending'}
              onChange={(e) => onStatusChange(e.target.value)}
              size="small"
              disabled={updatingStatus}
              sx={{
                fontSize: 12, fontWeight: 600, height: 28, color: sm.color,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: sm.color + '55' },
                '& .MuiSelect-icon': { color: sm.color },
              }}
            >
              {Object.entries(STATUS_META).map(([val, meta]) => (
                <MenuItem key={val} value={val} sx={{ fontSize: 12 }}>{meta.label}</MenuItem>
              ))}
            </Select>
          </Box>
          <Stack direction="row" alignItems="center">
            {isCustom && isAdmin && (
              <Tooltip title="Delete scenario">
                <IconButton size="small" onClick={onDeleteStep} sx={{ color: 'error.main', mr: 0.5 }}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton size="small" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
        <Stack spacing={2}>

          {/* Validates */}
          {step.validates && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 0.5 }}>
                Validates
              </Typography>
              <Typography variant="caption" color="text.secondary">{step.validates}</Typography>
            </Box>
          )}

          {/* Roles */}
          {'roles' in step && (step as Step).roles && (
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 0.5 }}>
                Roles
              </Typography>
              <Typography variant="caption" color="text.secondary">{(step as Step).roles}</Typography>
            </Box>
          )}

          <Divider />

          {/* Notes */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1 }}>
              Notes
            </Typography>
            <TextField
              size="small" multiline minRows={2} maxRows={5} fullWidth
              placeholder="Add notes about this test step…"
              value={notesVal}
              onChange={(e) => onNotesChange(e.target.value)}
            />
            {notesDirty && (
              <Button size="small" variant="contained" disabled={savingNotes} onClick={onSaveNotes} sx={{ mt: 1 }}>
                {savingNotes ? <CircularProgress size={14} color="inherit" /> : 'Save Notes'}
              </Button>
            )}
          </Box>

          <Divider />

          {/* Chat */}
          <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1.5 }}>
              Comments
            </Typography>

            {stepComments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                No comments yet.
              </Typography>
            ) : (
              <Stack spacing={1.5} sx={{ mb: 1 }}>
                {stepComments.map((c) => {
                  const isMe = c.author_email === currentUser.email;
                  return (
                    <Stack key={c.id} direction="row" justifyContent={isMe ? 'flex-end' : 'flex-start'}>
                      <Box sx={{
                        maxWidth: '85%',
                        bgcolor: isMe ? '#1565c0' : 'white',
                        color: isMe ? 'white' : 'text.primary',
                        border: isMe ? 'none' : '1px solid',
                        borderColor: 'divider',
                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        px: 1.5, py: 1,
                      }}>
                        {!isMe && (
                          <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.25, opacity: 0.7 }}>
                            {c.author_email}
                          </Typography>
                        )}
                        {c.message && (
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {c.message}
                          </Typography>
                        )}
                        {c.attachment_url && (
                          <Box sx={{ mt: c.message ? 0.75 : 0 }}>
                            {isImageUrl(c.attachment_url) ? (
                              <Box
                                component="img"
                                src={c.attachment_url}
                                alt="attachment"
                                sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: 1, display: 'block', cursor: 'pointer' }}
                                onClick={() => window.open(c.attachment_url!, '_blank')}
                              />
                            ) : (
                              <Stack direction="row" alignItems="center" spacing={0.5}
                                component="a" href={c.attachment_url} target="_blank" rel="noopener noreferrer"
                                sx={{ color: isMe ? '#90caf9' : 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                                <AttachFileIcon sx={{ fontSize: 14 }} />
                                <Typography variant="caption">Attachment</Typography>
                                <OpenInNewIcon sx={{ fontSize: 12 }} />
                              </Stack>
                            )}
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.6, fontSize: 10 }}>
                          {new Date(c.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })}
                <div ref={chatEndRef} />
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Input area — pinned to bottom */}
      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        {/* Error messages */}
        {uploadError && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.75 }}>{uploadError}</Typography>
        )}
        {sendError && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mb: 0.75 }}>{sendError}</Typography>
        )}
        {/* Pending attachment preview */}
        {pendingAttachment && (
          <Stack direction="row" alignItems="center" spacing={1}
            sx={{ mb: 1, bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 0.75 }}>
            <AttachFileIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" flex={1} noWrap>{pendingAttachment.name}</Typography>
            <IconButton size="small" onClick={() => setPendingAttachment(null)}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>
        )}

        <Stack direction="row" spacing={1} alignItems="flex-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Tooltip title="Attach file or screenshot">
            <span>
              <IconButton size="small" disabled={uploading} onClick={() => fileInputRef.current?.click()}
                sx={{ color: 'text.secondary', mb: 0.25 }}>
                {uploading ? <CircularProgress size={16} /> : <AttachFileIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>

          <TextField
            size="small" multiline maxRows={4} fullWidth
            placeholder="Write a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />

          <IconButton
            color="primary"
            disabled={(!draft.trim() && !pendingAttachment) || sending}
            onClick={handleSend}
            sx={{ mb: 0.25, flexShrink: 0 }}
          >
            {sending ? <CircularProgress size={18} color="inherit" /> : <SendIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TestingView({
  folderId,
  currentUser,
  isAdmin,
}: {
  folderId: string;
  currentUser: { email: string };
  isAdmin: boolean;
}) {
  const [results, setResults] = useState<Map<string, Result>>(new Map());
  const [comments, setComments] = useState<Comment[]>([]);
  const [customSteps, setCustomSteps] = useState<CustomStep[]>([]);
  const [loading, setLoading] = useState(true);

  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [drawerStepId, setDrawerStepId] = useState<string | null>(null);

  const [pendingNotes, setPendingNotes] = useState<Map<string, string>>(new Map());
  const [savingNotes, setSavingNotes] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());

  const [addScenarioOpen, setAddScenarioOpen] = useState(false);
  const [editStep, setEditStep] = useState<CustomStep | null>(null);
  const [hiddenStepIds, setHiddenStepIds] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/testing/results?folderId=${folderId}`).then((r) => r.json()),
      fetch(`/api/testing/comments?folderId=${folderId}`).then((r) => r.json()),
      fetch(`/api/testing/steps?folderId=${folderId}`).then((r) => r.json()),
      fetch(`/api/testing/hidden?folderId=${folderId}`).then((r) => r.json()),
    ]).then(([r, c, s, h]) => {
      const map = new Map<string, Result>();
      if (Array.isArray(r)) r.forEach((item: Result) => map.set(item.step_id, item));
      setResults(map);
      setComments(Array.isArray(c) ? c : []);
      setCustomSteps(Array.isArray(s) ? s : []);
      setHiddenStepIds(new Set(Array.isArray(h) ? h : []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [folderId]);

  async function hideStep(stepId: string) {
    await fetch('/api/testing/hidden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId, stepId }),
    });
    setHiddenStepIds((prev) => new Set(prev).add(stepId));
    if (drawerStepId === stepId) setDrawerStepId(null);
  }

  async function unhideStep(stepId: string) {
    await fetch(`/api/testing/hidden?folderId=${folderId}&stepId=${stepId}`, { method: 'DELETE' });
    setHiddenStepIds((prev) => { const next = new Set(prev); next.delete(stepId); return next; });
  }

  function toggleModule(mod: string) {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod); else next.add(mod);
      return next;
    });
  }

  async function updateStatus(stepId: string, status: string) {
    setUpdatingStatus((prev) => new Set(prev).add(stepId));
    try {
      const res = await fetch('/api/testing/results', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, stepId, status, notes: results.get(stepId)?.notes ?? null }),
      });
      if (res.ok) {
        const data: Result = await res.json();
        setResults((prev) => new Map(prev).set(stepId, data));
        // Auto-open drawer when status set to fail
        if (status === 'fail') setDrawerStepId(stepId);
      }
    } finally {
      setUpdatingStatus((prev) => { const next = new Set(prev); next.delete(stepId); return next; });
    }
  }

  async function saveNotes(stepId: string) {
    const notes = pendingNotes.get(stepId) ?? results.get(stepId)?.notes ?? '';
    setSavingNotes((prev) => new Set(prev).add(stepId));
    try {
      const res = await fetch('/api/testing/results', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, stepId, status: results.get(stepId)?.status ?? 'pending', notes: notes || null }),
      });
      if (res.ok) {
        const data: Result = await res.json();
        setResults((prev) => new Map(prev).set(stepId, data));
        setPendingNotes((prev) => { const next = new Map(prev); next.delete(stepId); return next; });
      }
    } finally {
      setSavingNotes((prev) => { const next = new Set(prev); next.delete(stepId); return next; });
    }
  }

  async function deleteCustomStep(id: string) {
    if (!window.confirm('Delete this custom scenario? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/testing/steps?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomSteps((prev) => prev.filter((s) => s.id !== id));
        if (drawerStepId === `custom-${id}`) setDrawerStepId(null);
      }
    } catch { /* network error — step stays */ }
  }

  // Build merged step list per module
  const allModules = Array.from(new Set([
    ...STEPS.map((s) => s.module),
    ...customSteps.map((s) => s.module),
  ]));

  const customModules = Array.from(new Set(customSteps.map((s) => s.module)));

  const drawerStep: Step | null = drawerStepId
    ? (() => {
        if (drawerStepId.startsWith('custom-')) {
          const cs = customSteps.find((s) => `custom-${s.id}` === drawerStepId);
          if (!cs) return null;
          return { id: `custom-${cs.id}`, module: cs.module, scenario: cs.scenario, type: cs.type, roles: '', validates: cs.validates, isCustom: true };
        }
        return STEPS.find((s) => s.id === drawerStepId) ?? null;
      })()
    : null;

  if (loading) return <CircularProgress size={24} />;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 2 }}>
        {isAdmin && hiddenStepIds.size > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={showHidden ? <VisibilityOutlinedIcon /> : <VisibilityOffOutlinedIcon />}
            onClick={() => setShowHidden((v) => !v)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {showHidden ? 'Hide hidden' : `Show hidden (${hiddenStepIds.size})`}
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => setAddScenarioOpen(true)}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Add Scenario
        </Button>
      </Stack>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 36, py: 1.25, fontWeight: 700, fontSize: 12, borderBottom: '1px solid', borderColor: 'divider' }} />
                <TableCell sx={{ py: 1.25, fontWeight: 700, fontSize: 12, borderBottom: '1px solid', borderColor: 'divider' }}>Scenario</TableCell>
                <TableCell sx={{ width: 120, py: 1.25, fontWeight: 700, fontSize: 12, borderBottom: '1px solid', borderColor: 'divider' }}>Type</TableCell>
                <TableCell sx={{ width: 160, py: 1.25, fontWeight: 700, fontSize: 12, borderBottom: '1px solid', borderColor: 'divider' }}>Status</TableCell>
                <TableCell sx={{ width: 48, borderBottom: '1px solid', borderColor: 'divider' }} />
              </TableRow>
            </TableHead>

            <TableBody>
              {allModules.map((mod) => {
                const staticSteps = STEPS.filter((s) => s.module === mod);
                const modCustomSteps = customSteps.filter((s) => s.module === mod);
                const isCollapsed = collapsedModules.has(mod);
                const visibleStaticIds = staticSteps
                  .filter((s) => showHidden || !hiddenStepIds.has(s.id))
                  .map((s) => s.id);
                const allModSteps = [...visibleStaticIds, ...modCustomSteps.map((s) => `custom-${s.id}`)];
                const modPassed = allModSteps.filter((id) => results.get(id)?.status === 'pass').length;

                return [
                  /* Module header */
                  <TableRow key={`mod-${mod}`}>
                    <TableCell colSpan={5} sx={{ p: 0, bgcolor: '#1565c0' }}>
                      <Stack
                        direction="row" alignItems="center" spacing={1}
                        sx={{ px: 1.5, py: 0.875, cursor: 'pointer' }}
                        onClick={() => toggleModule(mod)}
                      >
                        <KeyboardArrowDownIcon sx={{
                          color: 'white', fontSize: 18, flexShrink: 0,
                          transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                          transition: 'transform .2s',
                        }} />
                        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 13, flex: 1 }}>
                          {mod}
                        </Typography>
                        {modPassed > 0 && <CheckCircleIcon sx={{ color: '#a5d6a7', fontSize: 16 }} />}
                        <Box sx={{
                          bgcolor: 'white', borderRadius: '50%', width: 22, height: 22,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Typography sx={{ color: '#1565c0', fontWeight: 800, fontSize: 11, lineHeight: 1 }}>
                            {allModSteps.length}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                  </TableRow>,

                  /* Static step rows */
                  ...(!isCollapsed ? staticSteps
                    .filter((step) => showHidden || !hiddenStepIds.has(step.id))
                    .map((step) => {
                    const isHidden = hiddenStepIds.has(step.id);
                    const result = results.get(step.id);
                    const sm = STATUS_META[result?.status ?? 'pending'];
                    const stepComments = comments.filter((c) => c.step_id === step.id);
                    const hasComments = stepComments.length > 0;

                    return (
                      <TableRow
                        key={step.id}
                        hover
                        onClick={() => !isHidden && setDrawerStepId(step.id)}
                        sx={{ cursor: isHidden ? 'default' : 'pointer', opacity: isHidden ? 0.4 : 1 }}
                      >
                        <TableCell sx={{ px: 1.5, py: 1, color: 'text.disabled', fontSize: 11, fontWeight: 600 }}>
                          {step.id}
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4 }}>
                            {step.scenario}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap
                            sx={{ display: 'block', mt: 0.25, maxWidth: 400 }}>
                            {step.validates}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Chip label={step.type} size="small" variant="outlined" sx={{
                            fontSize: 11, fontWeight: 600, height: 22, borderRadius: '999px',
                            borderColor: step.type === 'Automated' ? '#1976d244' : '#f57c0044',
                            color: step.type === 'Automated' ? '#1976d2' : '#f57c00',
                            bgcolor: step.type === 'Automated' ? '#1976d211' : '#f57c0011',
                          }} />
                        </TableCell>
                        <TableCell sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
                          {!isHidden && (
                            <Select
                              value={result?.status ?? 'pending'}
                              onChange={(e) => updateStatus(step.id, e.target.value)}
                              size="small"
                              disabled={updatingStatus.has(step.id)}
                              sx={{
                                fontSize: 12, fontWeight: 600, height: 28, color: sm.color,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: sm.color + '55' },
                                '& .MuiSelect-icon': { color: sm.color },
                              }}
                            >
                              {Object.entries(STATUS_META).map(([val, meta]) => (
                                <MenuItem key={val} value={val} sx={{ fontSize: 12 }}>{meta.label}</MenuItem>
                              ))}
                            </Select>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            {!isHidden && (
                              <IconButton
                                size="small"
                                onClick={() => setDrawerStepId(step.id)}
                                sx={{ color: hasComments ? '#1976d2' : 'text.disabled' }}
                              >
                                {hasComments
                                  ? <ChatBubbleIcon sx={{ fontSize: 16 }} />
                                  : <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
                                }
                              </IconButton>
                            )}
                            {isAdmin && (
                              isHidden ? (
                                <Tooltip title="Show scenario">
                                  <IconButton size="small" onClick={() => unhideStep(step.id)} sx={{ color: 'text.secondary' }}>
                                    <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Hide scenario">
                                  <IconButton size="small" onClick={() => hideStep(step.id)} sx={{ color: 'text.secondary' }}>
                                    <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  }) : []),

                  /* Custom step rows */
                  ...(!isCollapsed ? modCustomSteps.map((cs) => {
                    const stepId = `custom-${cs.id}`;
                    const result = results.get(stepId);
                    const sm = STATUS_META[result?.status ?? 'pending'];
                    const stepComments = comments.filter((c) => c.step_id === stepId);
                    const hasComments = stepComments.length > 0;

                    return (
                      <TableRow
                        key={stepId}
                        hover
                        onClick={() => setDrawerStepId(stepId)}
                        sx={{ cursor: 'pointer', bgcolor: '#f8f4ff' }}
                      >
                        <TableCell sx={{ px: 1.5, py: 1 }}>
                          <Chip label="new" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#7b1fa211', color: '#7b1fa2' }} />
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4 }}>
                            {cs.scenario}
                          </Typography>
                          {cs.validates && (
                            <Typography variant="caption" color="text.secondary" noWrap
                              sx={{ display: 'block', mt: 0.25, maxWidth: 400 }}>
                              {cs.validates}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1 }}>
                          <Chip label={cs.type} size="small" variant="outlined" sx={{
                            fontSize: 11, fontWeight: 600, height: 22, borderRadius: '999px',
                            borderColor: cs.type === 'Automated' ? '#1976d244' : '#f57c0044',
                            color: cs.type === 'Automated' ? '#1976d2' : '#f57c00',
                            bgcolor: cs.type === 'Automated' ? '#1976d211' : '#f57c0011',
                          }} />
                        </TableCell>
                        <TableCell sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={result?.status ?? 'pending'}
                            onChange={(e) => updateStatus(stepId, e.target.value)}
                            size="small"
                            disabled={updatingStatus.has(stepId)}
                            sx={{
                              fontSize: 12, fontWeight: 600, height: 28, color: sm.color,
                              '& .MuiOutlinedInput-notchedOutline': { borderColor: sm.color + '55' },
                              '& .MuiSelect-icon': { color: sm.color },
                            }}
                          >
                            {Object.entries(STATUS_META).map(([val, meta]) => (
                              <MenuItem key={val} value={val} sx={{ fontSize: 12 }}>{meta.label}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            <IconButton
                              size="small"
                              onClick={() => setDrawerStepId(stepId)}
                              sx={{ color: hasComments ? '#1976d2' : 'text.disabled' }}
                            >
                              {hasComments
                                ? <ChatBubbleIcon sx={{ fontSize: 16 }} />
                                : <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
                              }
                            </IconButton>
                            {isAdmin && (
                              <Tooltip title="Edit scenario">
                                <IconButton
                                  size="small"
                                  onClick={() => setEditStep(cs)}
                                  sx={{ color: 'text.secondary' }}
                                >
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isAdmin && (
                              <Tooltip title="Delete scenario">
                                <IconButton
                                  size="small"
                                  onClick={() => deleteCustomStep(cs.id)}
                                  sx={{ color: 'error.main' }}
                                >
                                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  }) : []),
                ];
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Right-side comments drawer */}
      <Drawer
        anchor="right"
        open={!!drawerStepId && !!drawerStep}
        onClose={() => setDrawerStepId(null)}
        PaperProps={{ sx: { width: 420, boxShadow: 6 } }}
      >
        {drawerStep && (
          <StepDrawer
            step={drawerStep}
            folderId={folderId}
            result={results.get(drawerStep.id)}
            comments={comments}
            pendingNotes={pendingNotes.get(drawerStep.id)}
            savingNotes={savingNotes.has(drawerStep.id)}
            updatingStatus={updatingStatus.has(drawerStep.id)}
            currentUser={currentUser}
            isAdmin={isAdmin}
            isCustom={!!drawerStep.isCustom}
            onClose={() => setDrawerStepId(null)}
            onStatusChange={(status) => updateStatus(drawerStep.id, status)}
            onNotesChange={(val) => setPendingNotes((prev) => new Map(prev).set(drawerStep.id, val))}
            onSaveNotes={() => saveNotes(drawerStep.id)}
            onCommentSent={(comment) => setComments((prev) => [...prev, comment])}
            onDeleteStep={() => {
              if (drawerStep.isCustom) {
                const realId = drawerStep.id.replace('custom-', '');
                deleteCustomStep(realId);
              }
            }}
          />
        )}
      </Drawer>

      {/* Add Scenario dialog */}
      <AddScenarioDialog
        open={addScenarioOpen}
        folderId={folderId}
        existingModules={customModules}
        onClose={() => setAddScenarioOpen(false)}
        onCreated={(step) => setCustomSteps((prev) => [...prev, step])}
      />

      {/* Edit Scenario dialog */}
      <EditScenarioDialog
        step={editStep}
        existingModules={customModules}
        onClose={() => setEditStep(null)}
        onSaved={(updated) => {
          setCustomSteps((prev) => prev.map((s) => s.id === updated.id ? updated : s));
          setEditStep(null);
        }}
      />
    </Box>
  );
}
