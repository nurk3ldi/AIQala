import { ApiError } from './api-client';
import { hasTranslation, translate } from './i18n';

export const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    if (hasTranslation(`errors.${error.code}`)) {
      return translate(`errors.${error.code}`);
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return translate('errors.UNKNOWN');
};
