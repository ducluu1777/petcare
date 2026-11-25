export interface DeliveryAreaToggleSource {
  id: string;
  province: string;
  ward: string;
  fee: number;
  isActive: boolean;
}

export function getDeliveryAreaToggleInput(area: DeliveryAreaToggleSource) {
  return {
    id: area.id,
    province: area.province,
    ward: area.ward,
    fee: area.fee,
    isActive: !area.isActive,
  };
}
