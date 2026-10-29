// src/stores/useSageUpdateNoticeStore.ts
// 强制更新弹窗的打开状态：只存运行时状态，不落盘。每日公告弹窗靠它让行，等更新弹窗关了才轮到自己。

import { create } from 'zustand';

type SageUpdateNoticeState = {
    isUpdateNoticeOpen: boolean;
    setUpdateNoticeOpen: (isOpen: boolean) => void;
};

export const useSageUpdateNoticeStore = create<SageUpdateNoticeState>((set) => ({
    isUpdateNoticeOpen: false,
    setUpdateNoticeOpen: (isOpen) => set({ isUpdateNoticeOpen: isOpen }),
}));
