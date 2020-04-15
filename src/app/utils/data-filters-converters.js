import { get } from '@ember/object';
import _ from 'lodash';

export const dataObjectCategorizedFilters = [
  'filterType',
  'accessType',
];

export const studyCategorizedFilters = [
  'type',
  'status',
  'genderEligibility',
  'phase',
  'interventionModel',
  'allocationType',
  'primaryPurpose',
  'masking',
  'observationalModel',
  'timePerspective',
  'biospecimensRetained',
];

export function dataObjectFiltersToSave(filters) {
  filters = filters || {};

  const filtersToSave = {
    year: filters.year,
    publisher: getIdsFromCategorizedFilter(filters.publisher),
  };

  dataObjectCategorizedFilters.forEach(filterName => {
    filtersToSave[filterName] = getIdsFromCategorizedFilter(filters[filterName]);
  });

  return filtersToSave;
}

export function dataObjectFiltersFromSaved(filters, configuration, publisherMapping) {
  filters = filters || {};

  const publisherValue = filters.publisher;
  const savedFilters = {
    year: filters.year,
    publisher: publisherValue ?
      publisherValue.map(id => publisherMapping.findBy('id', id)).compact() :
      publisherMapping.slice(),
  };

  dataObjectCategorizedFilters.forEach(filterName => {
    const mapping = get(configuration, `dataObject${_.upperFirst(filterName)}Mapping`);
    const filterValue = filters[filterName];

    if (get(mapping, 'length')) {
      if (filterValue) {
        savedFilters[filterName] =
          filterValue.map(id => mapping.findBy('id', id)).compact();
      } else {
        savedFilters[filterName] = mapping.slice();
      }
    }
  });

  return savedFilters;
}

export function studyFiltersToSave(filters) {
  filters = filters || {};

  const filtersToSave = {};

  studyCategorizedFilters.forEach(filterName => {
    filtersToSave[filterName] = getIdsFromCategorizedFilter(filters[filterName]);
  });

  return filtersToSave;
}

export function studyFiltersFromSaved(filters, configuration) {
  filters = filters || {};

  const savedFilters = {};

  studyCategorizedFilters.forEach(filterName => {
    const mapping = get(configuration, `study${_.upperFirst(filterName)}Mapping`);
    const filterValue = filters[filterName];

    if (get(mapping, 'length')) {
      if (filterValue) {
        savedFilters[filterName] =
          filterValue.map(id => mapping.findBy('id', id)).compact();
      } else {
        savedFilters[filterName] = mapping.slice();
      }
    }
  });

  return savedFilters;
}

function getIdsFromCategorizedFilter(filter) {
  if (!filter) {
    return [];
  } else {
    return filter.mapBy('id');
  }
}
