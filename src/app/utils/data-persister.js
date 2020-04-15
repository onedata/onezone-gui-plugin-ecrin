import EmberObject, { get, getProperties, setProperties } from '@ember/object';
import {
  studyFiltersToSave,
  studyFiltersFromSaved,
  dataObjectFiltersToSave,
  dataObjectFiltersFromSaved,
} from 'onezone-gui-plugin-ecrin/utils/data-filters-converters';
import StudySearchParams from 'onezone-gui-plugin-ecrin/utils/study-search-params';
import safeExec from 'onezone-gui-plugin-ecrin/utils/safe-method-execution';

export default EmberObject.extend({
  /**
   * @virtual
   * @type {Service.IndexeddbStorage}
   */
  indexeddbStorage: undefined,

  /**
   * @virtual
   * @type {Service.Configuration}
   */
  configuration: undefined,

  /**
   * @virtual
   * @type {Utils.DataFetcher}
   */
  dataFetcher: undefined,

  /**
   * @virtual
   * @type {Utils.DataFetcher}
   */
  dataStore: undefined,

  getSavedResultsList() {
    return this.get('indexeddbStorage').loadResultsList();
  },

  removeSavedResultsEntry(results) {
    return this.get('indexeddbStorage').removeResults(results);
  },

  saveResults(name, studySearchParams) {
    const {
      indexeddbStorage,
      dataStore,
    } = this.getProperties(
      'indexeddbStorage',
      'dataStore'
    );
    const {
      studies,
      studyFilters,
      dataObjectFilters,
    } = getProperties(dataStore, 'studies', 'studyFilters', 'dataObjectFilters');
    const resultsToSave = {
      name,
      timestamp: Math.floor(Date.now() / 1000),
      studies: studies.mapBy('id'),
      studyFilters: studyFiltersToSave(studyFilters),
      dataObjectFilters: dataObjectFiltersToSave(dataObjectFilters),
      studySearchParams: studySearchParams.dumpValues(),
    };

    return indexeddbStorage.saveResults(resultsToSave);
  },

  loadResults(results, targetStudySearchParams) {
    const {
      configuration,
      dataStore,
      dataFetcher,
    } = this.getProperties('configuration', 'dataStore', 'dataFetcher');

    if (results.studySearchParams) {
      targetStudySearchParams.loadDumpedValues(
        results.studySearchParams,
        get(configuration, 'studyIdTypeMapping')
      );
    }

    dataStore.removeStudies(get(dataStore, 'studies'));
    dataStore.resetStudyFilters();
    dataStore.resetDataObjectFilters();
    return dataFetcher.searchStudies(StudySearchParams.create({
        mode: 'viaInternalId',
        internalStudyIds: get(results, 'studies'),
      }))
      .then(() => safeExec(this, () => {
        const {
          studyFilters: savedStudyFilters,
          dataObjectFilters: savedDataObjectFilters,
        } = results;
        const dataObjectPublisherMapping =
          get(dataStore, 'dataObjectPublisherMapping');
        const dataObjectFilters = dataObjectFiltersFromSaved(
          savedDataObjectFilters,
          configuration,
          dataObjectPublisherMapping
        );

        setProperties(dataStore, {
          studyFilters: studyFiltersFromSaved(
            savedStudyFilters,
            configuration
          ),
          dataObjectFilters,
        });
      }));
  },
});
