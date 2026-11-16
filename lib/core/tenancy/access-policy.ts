export type TenantAccessState = {
  active: boolean;
  managedProvisioning: boolean;
  onboardingCompleted: boolean;
  activatedAt: unknown | null;
};

/** Legacy memberships retain their existing authorization semantics. */
export function canOperateTenant(tenant: TenantAccessState): boolean {
  return tenant.active && (!tenant.managedProvisioning || (tenant.onboardingCompleted && tenant.activatedAt != null));
}

export function tenantAccessReason(tenant: TenantAccessState): "ready" | "preparing" | "suspended" {
  if (canOperateTenant(tenant)) return "ready";
  return tenant.managedProvisioning && !tenant.activatedAt ? "preparing" : "suspended";
}
