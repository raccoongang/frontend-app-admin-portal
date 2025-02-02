import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { ProductTour } from '@edx/paragon';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';
import Cookies from 'universal-cookie';

import { ROUTE_NAMES } from '../EnterpriseApp/constants';
import { SETTINGS_TABS_VALUES } from '../settings/data/constants';
import { features } from '../../config';
import {
  BROWSE_AND_REQUEST_TOUR_COOKIE_NAME,
  TOUR_TARGETS,
} from './constants';
import { SubsidyRequestsContext } from '../subsidy-requests';

const cookies = new Cookies();

const BrowseAndRequestTour = ({ enterpriseSlug }) => {
  const { subsidyRequestConfiguration } = useContext(SubsidyRequestsContext);
  const isFeatureEnabledForEnterprise = features.FEATURE_BROWSE_AND_REQUEST;

  const history = useHistory();
  const inSettingsPage = history.location.pathname.includes(ROUTE_NAMES.settings);

  const dismissedTourCookie = cookies.get(BROWSE_AND_REQUEST_TOUR_COOKIE_NAME);

  // Only show tour if feature is enabled, the enterprise is eligible for the feature,
  // hide cookie is undefined or false, not in settings page, and subsidy requests are not already enabled
  const showTour = isFeatureEnabledForEnterprise
    && !dismissedTourCookie && !inSettingsPage && !subsidyRequestConfiguration?.subsidyRequestsEnabled;

  const [tourEnabled, setTourEnabled] = useState(showTour);

  if (!showTour) {
    return null;
  }

  const disableTour = () => {
    cookies.set(
      BROWSE_AND_REQUEST_TOUR_COOKIE_NAME,
      true,
      { sameSite: 'strict' },
    );
  };

  const handleDismissTour = () => {
    disableTour();
    setTourEnabled(false);
  };

  const handleGoToSettings = () => {
    disableTour();
    history.push({ pathname: `/${enterpriseSlug}/admin/${ROUTE_NAMES.settings}/${SETTINGS_TABS_VALUES.access}` });
  };

  const tour = {
    tourId: 'BrowseAndRequestTour',
    endButtonText: 'Continue To Settings',
    dismissButtonText: 'Dismiss',
    enabled: tourEnabled,
    onDismiss: handleDismissTour,
    onEnd: handleGoToSettings,
    checkpoints: [
      {
        placement: 'right',
        body: "We've recently added a new feature that enables learners to browse for courses and request access. "
          + 'Continue to the settings page to learn more and configure access.',
        target: `#${TOUR_TARGETS.SETTINGS_SIDEBAR}`,
        title: 'New Feature',
        showDismissButton: true,
      },
    ],
  };

  return (
    <ProductTour
      tours={[tour]}
    />
  );
};

BrowseAndRequestTour.propTypes = {
  enterpriseSlug: PropTypes.string.isRequired,
};

const mapStateToProps = state => ({
  enterpriseSlug: state.portalConfiguration.enterpriseSlug,
});

export default connect(mapStateToProps)(BrowseAndRequestTour);
