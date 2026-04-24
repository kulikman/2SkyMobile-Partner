'use client';

import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
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
import Typography from '@mui/material/Typography';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SendIcon from '@mui/icons-material/Send';

// ── Static test-step data (seeded from platform-testing-flows-2026-04-22.xlsx) ─

type Step = { id: string; module: string; scenario: string; type: 'Automated' | 'Manual'; roles: string; validates: string };

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

const MODULES = Array.from(new Set(STEPS.map((s) => s.module)));

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: '#9e9e9e' },
  pass:     { label: 'Pass',     color: '#388e3c' },
  fail:     { label: 'Fail',     color: '#c62828' },
  blocked:  { label: 'Blocked',  color: '#f57c00' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Result = { step_id: string; status: string; notes: string | null; updated_by: string | null; updated_at: string };
type Comment = { id: string; step_id: string | null; author_email: string; message: string; created_at: string };

// ── Component ─────────────────────────────────────────────────────────────────

export function TestingView({ folderId, currentUser }: { folderId: string; currentUser: { email: string } }) {
  const [results, setResults] = useState<Map<string, Result>>(new Map());
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(new Set());
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // per-step pending notes (before save)
  const [pendingNotes, setPendingNotes] = useState<Map<string, string>>(new Map());
  const [savingNotes, setSavingNotes] = useState<Set<string>>(new Set());

  // per-step new comment draft
  const [commentDraft, setCommentDraft] = useState<Map<string, string>>(new Map());
  const [sendingComment, setSendingComment] = useState<Set<string>>(new Set());

  // status update loading
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());

  const chatEndRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    Promise.all([
      fetch(`/api/testing/results?folderId=${folderId}`).then((r) => r.json()),
      fetch(`/api/testing/comments?folderId=${folderId}`).then((r) => r.json()),
    ]).then(([r, c]) => {
      const map = new Map<string, Result>();
      if (Array.isArray(r)) r.forEach((item: Result) => map.set(item.step_id, item));
      setResults(map);
      setComments(Array.isArray(c) ? c : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [folderId]);

  // scroll chat to bottom when step expands or new comment arrives
  useEffect(() => {
    if (expandedStep) {
      const el = chatEndRefs.current.get(expandedStep);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [expandedStep, comments]);

  function toggleModule(mod: string) {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod); else next.add(mod);
      return next;
    });
  }

  async function updateStatus(stepId: string, status: string) {
    setUpdatingStatus((prev) => new Set(prev).add(stepId));
    const res = await fetch('/api/testing/results', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId, stepId, status, notes: results.get(stepId)?.notes ?? null }),
    });
    if (res.ok) {
      const data: Result = await res.json();
      setResults((prev) => new Map(prev).set(stepId, data));
    }
    setUpdatingStatus((prev) => { const next = new Set(prev); next.delete(stepId); return next; });
  }

  async function saveNotes(stepId: string) {
    const notes = pendingNotes.get(stepId) ?? results.get(stepId)?.notes ?? '';
    setSavingNotes((prev) => new Set(prev).add(stepId));
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
    setSavingNotes((prev) => { const next = new Set(prev); next.delete(stepId); return next; });
  }

  async function sendComment(stepId: string) {
    const message = (commentDraft.get(stepId) ?? '').trim();
    if (!message) return;
    setSendingComment((prev) => new Set(prev).add(stepId));
    const res = await fetch('/api/testing/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId, stepId, message }),
    });
    if (res.ok) {
      const data: Comment = await res.json();
      setComments((prev) => [...prev, data]);
      setCommentDraft((prev) => { const next = new Map(prev); next.set(stepId, ''); return next; });
    }
    setSendingComment((prev) => { const next = new Set(prev); next.delete(stepId); return next; });
  }

  // ── Progress ────────────────────────────────────────────────────────────────

  const total = STEPS.length;
  const passed = STEPS.filter((s) => results.get(s.id)?.status === 'pass').length;
  const failed = STEPS.filter((s) => results.get(s.id)?.status === 'fail').length;
  const blocked = STEPS.filter((s) => results.get(s.id)?.status === 'blocked').length;
  const progressPct = total > 0 ? Math.round((passed / total) * 100) : 0;

  if (loading) return <CircularProgress size={24} />;

  return (
    <Box>
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
              {MODULES.map((mod) => {
                const modSteps = STEPS.filter((s) => s.module === mod);
                const isCollapsed = collapsedModules.has(mod);
                const modPassed = modSteps.filter((s) => results.get(s.id)?.status === 'pass').length;

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
                        {modPassed > 0 && (
                          <CheckCircleIcon sx={{ color: '#a5d6a7', fontSize: 16 }} />
                        )}
                        <Box sx={{
                          bgcolor: 'white', borderRadius: '50%', width: 22, height: 22,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Typography sx={{ color: '#1565c0', fontWeight: 800, fontSize: 11, lineHeight: 1 }}>
                            {modSteps.length}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                  </TableRow>,

                  /* Step rows */
                  ...(!isCollapsed ? modSteps.flatMap((step) => {
                    const result = results.get(step.id);
                    const sm = STATUS_META[result?.status ?? 'pending'];
                    const isExpanded = expandedStep === step.id;
                    const stepComments = comments.filter((c) => c.step_id === step.id);
                    const hasComments = stepComments.length > 0;
                    const notesVal = pendingNotes.has(step.id)
                      ? (pendingNotes.get(step.id) ?? '')
                      : (result?.notes ?? '');
                    const notesDirty = pendingNotes.has(step.id) && pendingNotes.get(step.id) !== (result?.notes ?? '');

                    return [
                      <TableRow
                        key={step.id}
                        hover
                        onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                        sx={{ cursor: 'pointer', '& td': { borderBottom: isExpanded ? 'none' : undefined } }}
                      >
                        {/* # */}
                        <TableCell sx={{ px: 1.5, py: 1, color: 'text.disabled', fontSize: 11, fontWeight: 600 }}>
                          {step.id}
                        </TableCell>

                        {/* Scenario */}
                        <TableCell sx={{ py: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4 }}>
                            {step.scenario}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.25, maxWidth: 400 }}>
                            {step.validates}
                          </Typography>
                        </TableCell>

                        {/* Type chip */}
                        <TableCell sx={{ py: 1 }}>
                          <Chip
                            label={step.type}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontSize: 11, fontWeight: 600, height: 22, borderRadius: '999px',
                              borderColor: step.type === 'Automated' ? '#1976d244' : '#f57c0044',
                              color: step.type === 'Automated' ? '#1976d2' : '#f57c00',
                              bgcolor: step.type === 'Automated' ? '#1976d211' : '#f57c0011',
                            }}
                          />
                        </TableCell>

                        {/* Status select */}
                        <TableCell sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
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
                        </TableCell>

                        {/* Chat icon */}
                        <TableCell sx={{ py: 1 }} onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                            sx={{ color: hasComments ? '#1976d2' : 'text.disabled' }}
                          >
                            {hasComments
                              ? <ChatBubbleIcon sx={{ fontSize: 16 }} />
                              : <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
                            }
                          </IconButton>
                        </TableCell>
                      </TableRow>,

                      /* Expanded notes + chat panel */
                      isExpanded ? (
                        <TableRow key={`${step.id}-chat`}>
                          <TableCell colSpan={5} sx={{ p: 0, bgcolor: '#f8fafc' }}>
                            <Collapse in={isExpanded}>
                              <Box sx={{ px: 3, py: 2 }}>
                                <Stack spacing={2}>

                                  {/* Roles info */}
                                  <Typography variant="caption" color="text.secondary">
                                    <strong>Roles:</strong> {step.roles}
                                  </Typography>

                                  <Divider />

                                  {/* Notes */}
                                  <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary"
                                      sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1 }}>
                                      Notes
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                      <TextField
                                        size="small"
                                        multiline
                                        minRows={2}
                                        maxRows={5}
                                        fullWidth
                                        placeholder="Add notes about this test step…"
                                        value={notesVal}
                                        onChange={(e) => setPendingNotes((prev) => new Map(prev).set(step.id, e.target.value))}
                                      />
                                      {notesDirty && (
                                        <Button
                                          size="small"
                                          variant="contained"
                                          disabled={savingNotes.has(step.id)}
                                          onClick={() => saveNotes(step.id)}
                                          sx={{ flexShrink: 0, mt: 0.5 }}
                                        >
                                          {savingNotes.has(step.id) ? <CircularProgress size={14} color="inherit" /> : 'Save'}
                                        </Button>
                                      )}
                                    </Stack>
                                  </Box>

                                  <Divider />

                                  {/* Chat */}
                                  <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary"
                                      sx={{ textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', mb: 1 }}>
                                      Comments
                                    </Typography>

                                    {stepComments.length === 0 ? (
                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                        No comments yet. Be the first to leave a comment.
                                      </Typography>
                                    ) : (
                                      <Stack spacing={1.5} sx={{ mb: 1.5, maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
                                        {stepComments.map((c) => {
                                          const isMe = c.author_email === currentUser.email;
                                          return (
                                            <Stack key={c.id} direction="row" spacing={1} justifyContent={isMe ? 'flex-end' : 'flex-start'}>
                                              <Box
                                                sx={{
                                                  maxWidth: '75%',
                                                  bgcolor: isMe ? '#1565c0' : 'white',
                                                  color: isMe ? 'white' : 'text.primary',
                                                  border: isMe ? 'none' : '1px solid',
                                                  borderColor: 'divider',
                                                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                                  px: 1.5, py: 1,
                                                }}
                                              >
                                                {!isMe && (
                                                  <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.25, opacity: 0.7 }}>
                                                    {c.author_email}
                                                  </Typography>
                                                )}
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                  {c.message}
                                                </Typography>
                                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.6, fontSize: 10 }}>
                                                  {new Date(c.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                              </Box>
                                            </Stack>
                                          );
                                        })}
                                        <div ref={(el) => { chatEndRefs.current.set(step.id, el); }} />
                                      </Stack>
                                    )}

                                    {/* New comment input */}
                                    <Stack direction="row" spacing={1} alignItems="flex-end">
                                      <TextField
                                        size="small"
                                        multiline
                                        maxRows={4}
                                        fullWidth
                                        placeholder="Write a comment…"
                                        value={commentDraft.get(step.id) ?? ''}
                                        onChange={(e) => setCommentDraft((prev) => new Map(prev).set(step.id, e.target.value))}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendComment(step.id);
                                          }
                                        }}
                                      />
                                      <IconButton
                                        color="primary"
                                        disabled={!(commentDraft.get(step.id) ?? '').trim() || sendingComment.has(step.id)}
                                        onClick={() => sendComment(step.id)}
                                        sx={{ mb: 0.25, flexShrink: 0 }}
                                      >
                                        {sendingComment.has(step.id)
                                          ? <CircularProgress size={18} color="inherit" />
                                          : <SendIcon fontSize="small" />
                                        }
                                      </IconButton>
                                    </Stack>
                                  </Box>

                                </Stack>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      ) : null,
                    ];
                  }) : []),
                ];
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
