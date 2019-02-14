import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import QueryParams from 'onezone-gui-plugin-ecrin/utils/query-params';

export default Route.extend({
  configuration: service(),

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
      if (queryParams[filterName] && queryParams[filterName].length) {
        const mapping = this.get(`configuration.${mappingName}`);
        const filters = queryParams[filterName]
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
    console.log(queryParamsObject);
    return queryParamsObject;
  },
});
