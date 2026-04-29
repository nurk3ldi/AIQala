import { TranslationKey } from '../theme/LanguageContext';

export type OnboardingItem = {
  kicker: string;
  titleKey: TranslationKey;
};

export const onboardingItems: OnboardingItem[] = [
  {
    kicker: 'AIQala',
    titleKey: 'onboardingTitle1',
  },
  {
    kicker: 'AIQala',
    titleKey: 'onboardingTitle2',
  },
  {
    kicker: 'AIQala',
    titleKey: 'onboardingTitle3',
  },
];
