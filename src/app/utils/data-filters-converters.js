import { get } from '@ember/object';
import _ from 'lodash';

export const dataObjectCategorizedFilters = [
  'type',
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

export function getCleanDataObjectFilters(configuration, publisherMapping) {
  return dataObjectFiltersFromSaved(null, configuration, publisherMapping);
}

export function getCleanStudyFilters(configuration) {
  return studyFiltersFromSaved(null, configuration);
}

export function dataObjectFiltersToSave(filters) {
  const normalizedFilters = filters || {};

  const filtersToSave = {
    year: normalizedFilters.year,
    publisher: getIdsFromCategorizedFilter(normalizedFilters.publisher),
  };

  dataObjectCategorizedFilters.forEach(filterName => {
    filtersToSave[filterName] =
      getIdsFromCategorizedFilter(normalizedFilters[filterName]);
  });

  return filtersToSave;
}

export function dataObjectFiltersFromSaved(filters, configuration, publisherMapping) {
  const normalizedFilters = filters || {};

  const publisherValue = normalizedFilters.publisher;
  const publisher = publisherValue ?
    publisherValue.map(id => publisherMapping.findBy('id', id)).compact() :
    publisherMapping.slice();
  const savedFilters = {
    year: normalizedFilters.year,
    publisher,
  };

  dataObjectCategorizedFilters.forEach(filterName => {
    const mapping = get(configuration, `dataObject${_.upperFirst(filterName)}Mapping`);
    const filterValue = normalizedFilters[filterName];

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
  const normalizedFilters = filters || {};

  const filtersToSave = {};

  studyCategorizedFilters.forEach(filterName => {
    filtersToSave[filterName] =
      getIdsFromCategorizedFilter(normalizedFilters[filterName]);
  });

  return filtersToSave;
}

export function studyFiltersFromSaved(filters, configuration) {
  const normalizedFilters = filters || {};

  const savedFilters = {};

  studyCategorizedFilters.forEach(filterName => {
    const mapping = get(configuration, `study${_.upperFirst(filterName)}Mapping`);
    const filterValue = normalizedFilters[filterName];

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
