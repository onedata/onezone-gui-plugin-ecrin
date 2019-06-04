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
    const rawQueryParams = get(transition, 'to.queryParams');

    const queryParams = QueryParams.create();
    queryParams.consumeQueryParams(rawQueryParams);

    return queryParams;
  },
});
