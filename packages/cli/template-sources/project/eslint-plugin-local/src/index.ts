/**
 * ESLint Local Plugin
 * Custom rules for HAI3 screenset architecture enforcement
 */

import noBarrelExportsEventsEffects = require('./rules/no-barrel-exports-events-effects');
import noCoordinatorEffects = require('./rules/no-coordinator-effects');
import noMissingDomainId = require('./rules/no-missing-domain-id');
import domainEventFormat = require('./rules/domain-event-format');
import noInlineStyles = require('./rules/no-inline-styles');
import uikitNoBusinessLogic = require('./rules/uikit-no-business-logic');
import screenInlineComponents = require('./rules/screen-inline-components');

export = {
  rules: {
    'no-barrel-exports-events-effects': noBarrelExportsEventsEffects,
    'no-coordinator-effects': noCoordinatorEffects,
    'no-missing-domain-id': noMissingDomainId,
    'domain-event-format': domainEventFormat,
    'no-inline-styles': noInlineStyles,
    'uikit-no-business-logic': uikitNoBusinessLogic,
    'screen-inline-components': screenInlineComponents,
  },
};
