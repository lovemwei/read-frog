import type { APIProviderTypes } from "@/types/config/provider"
import ProviderIcon from "@/components/provider-icon"
import { useTheme } from "@/components/providers/theme-provider"
import { PROVIDER_ITEMS, getProviderItemName } from "@/utils/constants/providers"
export function ConfigHeader({ providerType }: { providerType: APIProviderTypes }) {
  const { theme } = useTheme()
  return <ProviderIcon logo={PROVIDER_ITEMS[providerType].logo(theme)} name={getProviderItemName(providerType)} textClassName="font-medium" />
}
