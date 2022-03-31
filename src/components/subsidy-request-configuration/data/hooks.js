import { useCallback, useEffect, useState } from 'react';
import { camelCaseObject } from '@edx/frontend-platform/utils';
import { logError } from '@edx/frontend-platform/logging';
import EnterpriseAccessApiService from '../../../data/services/EnterpriseAccessApiService';
import EcommerceApiService from '../../../data/services/EcommerceApiService';
import LicenseManagerApiService from '../../../data/services/LicenseManagerAPIService';
import { SUPPORTED_SUBSIDY_TYPES } from '../../../data/constants/subsidyRequests';

/**
 * Fetches the subsidy request configuration for the enterprise. If not found, creates a new
 * configuration with the correct subsidy type used for requests.
 *
 * @param {string} enterpriseUUID UUID of the enterprise
 * @returns {Object} {customerConfiguration: Object, isLoading: bool}
 */
// eslint-disable-next-line import/prefer-default-export
export const useSubsidyRequestConfiguration = (enterpriseUUID) => {
  const [subsidyRequestConfiguration, setSubsidyRequestConfiguration] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const createSubsidyRequestConfiguration = useCallback(async () => {
    try {
      const [couponsData, subscriptionsData] = await Promise.all([
        EcommerceApiService.fetchCouponOrders(),
        LicenseManagerApiService.fetchSubscriptions({
          enterprise_customer_uuid: enterpriseUUID,
        }),
      ]);
      const hasCoupons = couponsData.data.results.length > 0;
      const hasSubscriptions = subscriptionsData.data.results.length > 0;

      // If the customer has two subsidy types, they are not eligible for Browse & Request in the MVP
      // A subsidy type of null on the customer configuration indicates that the customer is not eligible
      let subsidyType = null;

      if (!(hasCoupons && hasSubscriptions)) {
        if (hasCoupons) {
          subsidyType = SUPPORTED_SUBSIDY_TYPES.coupon;
        } else if (hasSubscriptions) {
          subsidyType = SUPPORTED_SUBSIDY_TYPES.license;
        }
      }

      const response = await EnterpriseAccessApiService.createSubsidyRequestConfiguration({
        enterpriseId: enterpriseUUID,
        subsidyType,
      });

      const customerConfiguration = camelCaseObject(response.data);
      setSubsidyRequestConfiguration(customerConfiguration);
    } catch (error) {
      // log error and do nothing
      logError(error);
    }
  }, [enterpriseUUID]);

  const loadSubsidyRequestConfiguration = useCallback(
    async ({ clearCacheEntry = false } = { clearCacheEntry: false },
    ) => {
      try {
        const response = await EnterpriseAccessApiService.getSubsidyRequestConfiguration(
          { enterpriseId: enterpriseUUID, clearCacheEntry },
        );
        const customerConfiguration = camelCaseObject(response.data);
        setSubsidyRequestConfiguration(customerConfiguration);
      } catch (error) {
        logError(error);
        throw error;
      }
    }, [enterpriseUUID],
  );

  useEffect(() => {
    if (!enterpriseUUID) {
      return;
    }

    const loadConfiguration = async () => {
      try {
        await loadSubsidyRequestConfiguration();
      } catch (error) {
        const httpErrorStatus = error.customAttributes?.httpErrorStatus;
        if (httpErrorStatus === 404) {
          // Customer configuration does not exist, create one
          await createSubsidyRequestConfiguration();
        } else {
          logError(error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, [enterpriseUUID]);

  const updateSubsidyRequestConfiguration = useCallback(async ({
    subsidyType,
    isSubsidyRequestsEnabled,
  }) => {
    const options = {
      subsidy_type: subsidyType,
      subsidy_requests_enabled: isSubsidyRequestsEnabled,
    };

    try {
      const response = await EnterpriseAccessApiService.updateSubsidyRequestConfiguration(
        enterpriseUUID,
        options,
      );
      const config = camelCaseObject(response.data);

      setSubsidyRequestConfiguration(config);
      loadSubsidyRequestConfiguration({ clearCacheEntry: true });
    } catch (err) {
      logError(err);
      throw err;
    }
  }, [enterpriseUUID]);

  return {
    subsidyRequestConfiguration,
    isLoading,
    updateSubsidyRequestConfiguration,
  };
};
