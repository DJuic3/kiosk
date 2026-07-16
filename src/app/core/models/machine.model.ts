export interface MachineInfo {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  supportedPayments: string[];
}

export interface MachineHealth {
  online: boolean;
  printerOk: boolean;
  dispenserOk: boolean;
  cashAcceptorOk: boolean;
  lastHeartbeat: string;
}
