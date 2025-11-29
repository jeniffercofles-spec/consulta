export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}

export interface DocumentInfo {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface UserContext {
  name: string;
  isAuthenticated: boolean;
}