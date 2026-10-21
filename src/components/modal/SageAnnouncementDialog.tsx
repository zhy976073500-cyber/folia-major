import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetButton } from '../shared/Sheet';
import { getStoredString, setStoredString } from '../../stores/storagePrimitives';
import { usePlaybackEntryViewStore } from '../../stores/usePlaybackEntryViewStore';
import { useSettingsModalStore } from '../../stores/useSettingsModalStore';
import { useThemeSettingsStore } from '../../stores/useThemeSettingsStore';
import { SAGE_REWARD_CODE_URL } from './sageRewardCode';

// src/components/modal/SageAnnouncementDialog.tsx
// Sage 自建实例的公告：每个自然日最多自动出现一次，并等启动流程和设置窗口空闲后再显示。

const LAST_SHOWN_DATE_STORAGE_KEY = 'folia_sage_announcement_last_shown_date';
const OPEN_DELAY_MS = 900;

const localDateKey = (date: Date) => (
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

type SageAnnouncementDialogProps = {
    /** 版本说明等启动弹窗打开时先让行，关闭后再判断今天是否需要显示公告。 */
    isStartupBlocked: boolean;
};

const SageAnnouncementDialog: React.FC<SageAnnouncementDialogProps> = ({ isStartupBlocked }) => {
    const { t } = useTranslation();
    const isDaylight = useThemeSettingsStore(state => state.isDaylight);
    const isPlaybackEntryViewPromptOpen = usePlaybackEntryViewStore(state => state.isPlaybackEntryViewPromptOpen);
    const isSettingsOpen = useSettingsModalStore(state => state.settingsModalState.isOpen);
    const isUserGuideModalOpen = useSettingsModalStore(state => state.isUserGuideModalOpen);
    const [isOpen, setIsOpen] = useState(false);

    const isBlocked = isStartupBlocked
        || isPlaybackEntryViewPromptOpen
        || isSettingsOpen
        || isUserGuideModalOpen;

    useEffect(() => {
        if (isOpen || isBlocked) {
            return;
        }
        if (getStoredString(LAST_SHOWN_DATE_STORAGE_KEY, '') === localDateKey(new Date())) {
            return;
        }

        const timer = window.setTimeout(() => {
            setIsOpen(true);
        }, OPEN_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [isBlocked, isOpen]);

    const close = useCallback(() => {
        setStoredString(LAST_SHOWN_DATE_STORAGE_KEY, localDateKey(new Date()));
        setIsOpen(false);
    }, []);

    return (
        <Sheet
            isOpen={isOpen}
            onClose={close}
            isDaylight={isDaylight}
            size="m"
            title={t('sageAnnouncement.title')}
            footer={<SheetButton variant="primary" onClick={close}>{t('ui.close')}</SheetButton>}
        >
            <div data-testid="sage-announcement-dialog" className="space-y-3.5">
                <p className="text-[13px] leading-[21px] text-[color:var(--st-t1)]">
                    {t('sageAnnouncement.intro')}
                </p>
                <div className="st-card overflow-hidden rounded-xl bg-[var(--st-card)] px-4 py-3 shadow-[0_0_0_1px_var(--st-line)]">
                    <p className="text-[13px] leading-[21px] text-[color:var(--st-t1)]">
                        {t('sageAnnouncement.feedback')}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-[21px] text-[color:var(--st-t1)]">
                        {t('sageAnnouncement.more')}
                    </p>
                </div>
                <p className="pt-1 text-center text-[13px] leading-[21px] text-[color:var(--st-t2)]">
                    {t('sageAnnouncement.support')}
                </p>
                <img
                    src={SAGE_REWARD_CODE_URL}
                    alt={t('sageAnnouncement.rewardAlt')}
                    className="mx-auto aspect-square w-60 max-w-full rounded-2xl object-cover shadow-[0_0_0_1px_var(--st-line)]"
                />
            </div>
        </Sheet>
    );
};

export default SageAnnouncementDialog;
