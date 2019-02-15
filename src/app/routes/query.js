import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import QueryParams from 'onezone-gui-plugin-ecrin/utils/query-params';

export default Route.extend({
  configuration: service(),

  queryParams: {
    mode: { refreshModel: true },
    studyId: { refreshModel: true },
    studyTitleContains: { refreshModel: true },
    studyTopicsInclude: { refreshModel: true },
    yearFilter: { refreshModel: true },
    doi: { refreshModel: true },
    typeFilter: { refreshModel: true },
    accessTypeFilter: { refreshModel: true },
    publisherFilter: { refreshModel: true },
  },

  model(params, transition) {
    const queryParams = get(transition, 'queryParams');
    const queryParamsObject = QueryParams.create();
    [
      'mode',
      'studyId',
      'studyTitleContains',
      'studyTopicsInclude',
      'yearFilter',
      'doi',
    ].forEach(filterName => {
      if (queryParams[filterName]) {
        set(queryParamsObject, filterName, queryParams[filterName]);
      }
    });
    [
      ['typeFilter', 'typeMapping'],
      ['accessTypeFilter', 'accessTypeMapping'],
      ['publisherFilter', 'publisherMapping'],
    ].forEach(([filterName, mappingName]) => {
      let filters = queryParams[filterName];
      try {
        filters = JSON.parse(queryParams[filterName]);
      } catch (e) {
        filters = [];
      }
      if (filters && filters.length) {
        const mapping = this.get(`configuration.${mappingName}`);
        filters = filters
          .reduce((arr, filterId) => {
            const filter = mapping.findBy('id', filterId);
            if (filter) {
              arr.push(filter);
            }
            return arr;
          }, []);
        set(queryParamsObject, filterName, filters);
      }
    });
    return queryParamsObject;
  },
});
