export interface Role {
  id: string;
  name: string; // e.g., Admin, Manager, Viewer
  permissions: string[];
}