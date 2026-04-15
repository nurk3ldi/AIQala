import { useEffect, useState } from 'react';

import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { InputField, SelectField, TextareaField } from '../components/ui/Fields';
import { useToast } from '../context/toast-context';
import { api } from '../lib/api-client';
import { getErrorMessage } from '../lib/errors';
import { formatPriorityLabel, percentage } from '../lib/format';
import type { City, District, ModerationResult, RequestAnalysisResult } from '../types/api';

export const AiStudioPage = () => {
  const { pushToast } = useToast();
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<RequestAnalysisResult | null>(null);
  const [moderationForm, setModerationForm] = useState({
    text: '',
    context: 'general',
  });
  const [analysisForm, setAnalysisForm] = useState({
    title: '',
    description: '',
    cityId: '',
    districtId: '',
  });

  useEffect(() => {
    void api.locations.cities.list().then(setCities).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!analysisForm.cityId) {
      setDistricts([]);
      setAnalysisForm((current) => (current.districtId ? { ...current, districtId: '' } : current));
      return;
    }

    let active = true;

    void api.locations.districts
      .list({ cityId: analysisForm.cityId })
      .then((items) => {
        if (active) {
          setDistricts(items);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [analysisForm.cityId]);

  const runModeration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModerationBusy(true);

    try {
      const result = await api.ai.moderate({
        text: moderationForm.text,
        context: moderationForm.context as 'general' | 'request' | 'comment' | 'profile',
      });
      setModerationResult(result);
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'Модерация сәтсіз аяқталды',
        description: getErrorMessage(error),
      });
    } finally {
      setModerationBusy(false);
    }
  };

  const runAnalysis = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAnalysisBusy(true);

    try {
      const result = await api.ai.analyzeRequest({
        title: analysisForm.title,
        description: analysisForm.description,
        cityId: analysisForm.cityId || undefined,
        districtId: analysisForm.districtId || undefined,
      });
      setAnalysisResult(result);
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'Талдау сәтсіз аяқталды',
        description: getErrorMessage(error),
      });
    } finally {
      setAnalysisBusy(false);
    }
  };

  return (
    <div className="page">
      <section className="page-header glass-card">
        <div>
          <span className="eyebrow">AI студия</span>
          <h1>Модерация және талдау құралдары</h1>
          <p>Бұл панельдер Gemini-ге қосылған backend endpoint-терімен тікелей жұмыс істейді.</p>
        </div>
      </section>

      <section className="split-layout">
        <article className="panel glass-card">
          <div className="panel__header">
            <span className="section-title__eyebrow">Мәтін модерациясы</span>
            <h3>Қауіпсіздік тексеруі</h3>
          </div>
          <form className="page" onSubmit={runModeration}>
            <SelectField
              label="Контекст"
              value={moderationForm.context}
              onChange={(event) => setModerationForm((current) => ({ ...current, context: event.target.value }))}
            >
              <option value="general">Жалпы</option>
              <option value="request">Өтінім</option>
              <option value="comment">Пікір</option>
              <option value="profile">Профиль</option>
            </SelectField>
            <TextareaField
              label="Мәтін"
              value={moderationForm.text}
              onChange={(event) => setModerationForm((current) => ({ ...current, text: event.target.value }))}
              required
              minLength={1}
            />
            <Button type="submit" busy={moderationBusy}>
              Модерацияны іске қосу
            </Button>
          </form>

          {moderationResult ? (
            <div className="panel glass-card">
              <div className="record-card__footer">
                <Badge tone={moderationResult.isAllowed ? 'success' : 'danger'}>
                  {moderationResult.isAllowed ? 'Рұқсат етілді' : 'Бұғатталды'}
                </Badge>
                <Badge tone={moderationResult.riskLevel === 'high' ? 'danger' : moderationResult.riskLevel === 'medium' ? 'warning' : 'success'}>
                  {{
                    low: 'Төмен тәуекел',
                    medium: 'Орташа тәуекел',
                    high: 'Жоғары тәуекел',
                  }[moderationResult.riskLevel]}
                </Badge>
              </div>
              <p className="muted-text">{moderationResult.explanation}</p>
              {moderationResult.sanitizedText ? (
                <div>
                  <strong>Тазартылған мәтін</strong>
                  <p className="muted-text">{moderationResult.sanitizedText}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>

        <article className="panel glass-card">
          <div className="panel__header">
            <span className="section-title__eyebrow">Өтінім талдауы</span>
            <h3>Құрылымдалған талдау</h3>
          </div>
          <form className="page" onSubmit={runAnalysis}>
            <InputField
              label="Тақырып"
              value={analysisForm.title}
              onChange={(event) => setAnalysisForm((current) => ({ ...current, title: event.target.value }))}
              required
              minLength={4}
            />
            <TextareaField
              label="Сипаттама"
              value={analysisForm.description}
              onChange={(event) => setAnalysisForm((current) => ({ ...current, description: event.target.value }))}
              required
              minLength={10}
            />
            <div className="grid-2">
              <SelectField
                label="Қала"
                value={analysisForm.cityId}
                onChange={(event) => setAnalysisForm((current) => ({ ...current, cityId: event.target.value }))}
              >
                <option value="">Міндетті емес</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Аудан"
                value={analysisForm.districtId}
                onChange={(event) => setAnalysisForm((current) => ({ ...current, districtId: event.target.value }))}
                disabled={!analysisForm.cityId}
              >
                <option value="">Міндетті емес</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button type="submit" busy={analysisBusy}>
              Талдауды іске қосу
            </Button>
          </form>

          {analysisResult ? (
            <div className="page">
              <div className="record-card">
                <div className="record-card__footer">
                  <Badge tone="accent">{analysisResult.issueType}</Badge>
                  <Badge tone="warning">{formatPriorityLabel(analysisResult.priority)}</Badge>
                </div>
                <p className="muted-text">{analysisResult.summary}</p>
                <p className="muted-text">Сенімділік: {percentage(analysisResult.confidence)}</p>
              </div>
              <div className="kv-grid">
                <div className="kv-item">
                  <span>Ұсынылған санат</span>
                  <strong>{analysisResult.suggestedCategory?.name ?? 'Жоқ'}</strong>
                </div>
                <div className="kv-item">
                  <span>Ұсынылған ұйым</span>
                  <strong>{analysisResult.suggestedOrganization?.name ?? 'Жоқ'}</strong>
                </div>
              </div>
            </div>
          ) : null}
        </article>
      </section>
    </div>
  );
};
