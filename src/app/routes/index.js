/**
 * Query route. Deals with filter query params and passes them to
 * query components.
 * 
 * @module routes/index
 * @author Michał Borzęcki
 * @copyright (C) 2019 ACK CYFRONET AGH
 * @license This software is released under the MIT license cited in 'LICENSE.txt'.
 */

import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get } from '@ember/object';
import QueryParams from 'onezone-gui-plugin-ecrin/utils/query-params';

export default Route.extend({
  configuration: service(),

  queryParams: {
    mode: { refreshModel: true },
    studyIdType: { refreshModel: true },
    studyId: { refreshModel: true },
    studyTitleContains: { refreshModel: true },
    studyTopicsInclude: { refreshModel: true },
    studyTitleTopicOperator: { refreshModel: true },
    doi: { refreshModel: true },
    dataObjectTitle: { refreshModel: true },
    yearFilter: { refreshModel: false },
    typeFilter: { refreshModel: false },
    accessTypeFilter: { refreshModel: false },
    publisherFilter: { refreshModel: false },
  },

  model(params, transition) {
    const configuration = this.get('configuration');
    const rawQueryParams = get(transition, 'to.queryParams');

    const queryParams = QueryParams.create();
    queryParams.consumeQueryParams(rawQueryParams, configuration);

    return queryParams;
  },
});
