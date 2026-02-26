export type UserRole = 'MASTER' | 'ADMIN' | 'USER';

export interface User {
    id: string;
    username: string;
    role: UserRole;
    name: string;
}

export interface BadgeLayer {
    id: string;
    type: 'text' | 'image' | 'photo' | 'square' | 'circle' | 'line' | 'triangle';
    content: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    fontSize: number;
    color: string;
    fontFamily: string;
    fontWeight: string;
    mapping?: string; // Column name from CSV
    borderColor?: string;
    borderWidth?: number;
    hasFill?: boolean;
    borderRadius?: number;
    shape?: 'rect' | 'circle' | 'oval';
    rotation?: number; // In degrees
}

export interface BadgeTemplate {
    id: string;
    name: string;
    ownerId: string;
    isPublic: boolean;
    orientation: 'horizontal' | 'vertical';
    bleed: number;
    front: {
        background: string | null;
        layers: BadgeLayer[];
    };
    back: {
        background: string | null;
        layers: BadgeLayer[];
    };
    targetGroup?: string | null;
}

export interface BatchRecord {
    id: string;
    groupName?: string | null;
    data: Record<string, string>;
}

export interface ModalConfig {
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt' | 'onboarding';
    title: string;
    message: string;
    defaultValue?: string;
    onConfirm?: (value?: string) => void;
}
